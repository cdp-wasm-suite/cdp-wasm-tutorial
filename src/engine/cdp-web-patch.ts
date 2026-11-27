// Turns a tutorial snippet into a cdp-web patch (https://cdp-web.app).
//
// The snippet is run against a *recording* stand-in for the cdp-wasm API:
// no audio is processed. Every cdp.process / cdp.run call becomes a node in a
// cdp-web graph:
//
//   - a catalog effect when the command is exactly what that effect's argument
//     template produces (so it opens with proper controls, and breakpoint files
//     become editable envelopes);
//   - otherwise a "Raw CDP" node running the very same command line.
//
// pvoc anal / pvoc synth become cdp-web's PVOC Analyse / Resynthesise adapters,
// which run the same `pvoc anal 1` / `pvoc synth`. Anything cdp-web cannot
// express (e.g. .frq/.trn pitch-data files passed between programs, or a
// command needing several data files) is left out, and the outputs that depend
// on it are reported in `omitted`.

import { EFFECTS, ENVELOPE_PARAMS, buildArgs } from 'cdp-wasm';

export const CDP_WEB_URL = 'https://cdp-web.app/';

type Domain = 'audio' | 'spectral';
/** pvoc synth writes 32-bit float; the tutorial sounds are integer PCM. An
 *  analysis records its sound's sample type, and CDP refuses to combine two
 *  spectra whose original sample types differ. */
type SampleFormat = 'int' | 'float';

/** A stream of audio or spectral data produced by a node in the graph. */
interface StreamTok {
  readonly __tok: 'stream';
  node: string;
  domain: Domain;
  /** Set when this spectrum can't survive the resynthesise -> analyse round
   *  trip cdp-web puts between Raw nodes (so only listening to it works). */
  fragile?: string;
}
interface TextTok {
  readonly __tok: 'text';
  text: string;
}
/** A value cdp-web can't carry between nodes; anything built from it is dropped. */
interface PoisonTok {
  readonly __tok: 'poison';
  reason: string;
}
type Tok = StreamTok | TextTok | PoisonTok;

const isTok = (v: unknown): v is Tok => !!v && typeof v === 'object' && '__tok' in v;
const stream = (node: string, domain: Domain): StreamTok => ({ __tok: 'stream', node, domain });
const poison = (reason: string): PoisonTok => ({ __tok: 'poison', reason });

class Unrepresentable extends Error {}

interface PatchNode {
  id: string;
  type: string;
  name?: string;
  x: number;
  y: number;
  [key: string]: unknown;
}
interface PatchEdge {
  from: { node: string; port: string };
  to: { node: string; port: string };
}

export interface CdpWebPatchResult {
  /** The cdp-web-patch v1 document, or null when no output could be expressed. */
  patch: Record<string, unknown> | null;
  /** Outputs of the snippet that the patch leaves out, with the reason. */
  omitted: { label: string; reason: string }[];
  /** Number of snippet outputs the patch reproduces. */
  outputCount: number;
}

// Catalog effects whose arguments are exactly their template (no derived data
// files, pipelines, channel conforming, etc.): only these can stand in for a
// literal command line.
const MATCHABLE = EFFECTS.filter(
  (e: any) =>
    Array.isArray(e.args) &&
    !e.data &&
    !e.pipeline &&
    !e.mixChain &&
    !e.derive &&
    !e.collect &&
    !e.variadicInputs &&
    !e.fixedParams &&
    !e.multiOut &&
    !e.input &&
    !e.external,
);

const numeric = (s: string) => s.trim() !== '' && Number.isFinite(Number(s));
const sameArg = (a: string, b: string) => a === b || (numeric(a) && numeric(b) && Number(a) === Number(b));

class GraphBuilder {
  nodes: PatchNode[] = [];
  edges: PatchEdge[] = [];
  private outDomain = new Map<string, Domain>();
  /** Sample format a node's output carries ('float' once pvoc synth has run). */
  private format = new Map<string, SampleFormat>();
  private adapters = new Map<string, string>();
  private sources = new Map<string, string>();
  private seq = 0;

  constructor(private audioUrl: (file: string) => string) {}

  private add(node: { id: string; type: string; [key: string]: unknown }, domain: Domain | null): string {
    this.nodes.push({ ...node, x: 0, y: 0 });
    if (domain) this.outDomain.set(node.id, domain);
    return node.id;
  }

  nextId(prefix: string) {
    this.seq += 1;
    return `${prefix}${this.seq}`;
  }

  formatOf(id: string): SampleFormat {
    if (id === '__float') return 'float'; // a resynth adapter not yet added
    return this.format.get(id) ?? 'int';
  }

  setFormat(id: string, f: SampleFormat) {
    this.format.set(id, f);
  }

  /** A version of `tok` that has been through pvoc synth, so its analysis is
   *  marked float like the spectra coming out of Raw nodes. */
  floatVersion(tok: StreamTok): StreamTok {
    const key = `${tok.node}>float`;
    let id = this.adapters.get(key);
    if (!id) {
      const spectral = this.resolve(tok, 'spectral');
      id = this.add(
        { id: this.nextId('synth'), type: 'pvocResynth', name: 'Resynthesise (match sample format)' },
        'audio',
      );
      this.edge(spectral, id);
      this.format.set(id, 'float');
      this.adapters.set(key, id);
    }
    return stream(id, tok.domain);
  }

  edge(from: string, to: string, toPort = 'in') {
    this.edges.push({ from: { node: from, port: 'out' }, to: { node: to, port: toPort } });
  }

  source(file: string): StreamTok {
    const clean = file.replace(/^\/+/, '');
    let id = this.sources.get(clean.toLowerCase());
    if (!id) {
      id = this.add(
        {
          id: this.nextId('src'),
          type: 'source',
          name: clean,
          source: { kind: 'url', url: this.audioUrl(clean), name: clean },
        },
        'audio',
      );
      this.sources.set(clean.toLowerCase(), id);
    }
    return stream(id, 'audio');
  }

  /** The node a Raw node's audio input would be cabled from (without adding
   *  it): `tok`'s node itself, or a resynth adapter if it outputs a spectrum. */
  peekAudio(tok: StreamTok): string {
    if (this.outDomain.get(tok.node) === 'audio') return tok.node;
    return this.adapters.get(`${tok.node}>audio`) ?? '__float';
  }

  /** The node to cable from so that `tok` arrives in the wanted domain. */
  resolve(tok: StreamTok, want: Domain): string {
    if (this.outDomain.get(tok.node) === want) return tok.node;
    const key = `${tok.node}>${want}`;
    let id = this.adapters.get(key);
    if (!id) {
      id = this.add(
        { id: this.nextId(want === 'spectral' ? 'anal' : 'synth'), type: want === 'spectral' ? 'pvocAnalyse' : 'pvocResynth' },
        want,
      );
      this.edge(tok.node, id);
      this.format.set(id, want === 'audio' ? 'float' : this.formatOf(tok.node));
      this.adapters.set(key, id);
    }
    return id;
  }

  effect(effect: any, values: Record<string, unknown>, envs: Record<string, unknown>, unlocked: boolean): string {
    const state: Record<string, unknown> = { values, envs };
    if (unlocked) state.unlocked = true;
    return this.add(
      { id: this.nextId('fx'), type: 'transform', effectId: effect.id, state },
      effect.domain === 'spectral' ? 'spectral' : 'audio',
    );
  }

  raw(program: string, args: string, data: string, name: string): string {
    return this.add({ id: this.nextId('raw'), type: 'rawTransform', name, raw: { program, args, data } }, 'audio');
  }

  output(label: string): string {
    return this.add({ id: this.nextId('out'), type: 'output', name: label }, null);
  }

  /** Drop nodes no Output depends on (e.g. a pitch trace whose consumer was left out). */
  prune() {
    const keep = new Set(this.nodes.filter((n) => n.type === 'output').map((n) => n.id));
    let grew = true;
    while (grew) {
      grew = false;
      for (const e of this.edges) {
        if (keep.has(e.to.node) && !keep.has(e.from.node)) {
          keep.add(e.from.node);
          grew = true;
        }
      }
    }
    this.nodes = this.nodes.filter((n) => keep.has(n.id));
    this.edges = this.edges.filter((e) => keep.has(e.from.node) && keep.has(e.to.node));
  }

  /** Simple left-to-right layout by depth; cdp-web re-arranges on load anyway. */
  layout() {
    const depth = new Map<string, number>(this.nodes.map((n) => [n.id, 0]));
    for (let pass = 0; pass < this.nodes.length; pass++) {
      let changed = false;
      for (const e of this.edges) {
        const d = (depth.get(e.from.node) ?? 0) + 1;
        if (d > (depth.get(e.to.node) ?? 0)) {
          depth.set(e.to.node, d);
          changed = true;
        }
      }
      if (!changed) break;
    }
    const rows = new Map<number, number>();
    for (const n of this.nodes) {
      const d = depth.get(n.id) ?? 0;
      const row = rows.get(d) ?? 0;
      rows.set(d, row + 1);
      n.x = 40 + d * 240;
      n.y = 60 + row * 180;
    }
  }
}

interface CallIO {
  /** Argument tokens with stream inputs as $IN/$IN2 and the stream output as $OUT. */
  tokens: string[];
  /** Input streams in port order (in, in2). */
  inputs: StreamTok[];
  /** Data files referenced by path in `tokens`. */
  texts: Map<string, string>;
  outDomain: Domain;
}

/** Try to express a command as a catalog effect with identical arguments. */
function matchCatalog(program: string, io: CallIO) {
  const inDomain = io.inputs[0]?.domain;
  for (const effect of MATCHABLE as any[]) {
    if (effect.program !== program) continue;
    const domain: Domain = effect.domain === 'spectral' ? 'spectral' : 'audio';
    if (domain !== io.outDomain || io.inputs.some((t) => t.domain !== domain) || inDomain !== domain) continue;
    if ((effect.inputs || 1) !== io.inputs.length) continue;
    if (effect.args.length !== io.tokens.length) continue;

    const values: Record<string, unknown> = {};
    const envs: Record<string, unknown> = {};
    const envCapable: string[] = (ENVELOPE_PARAMS as Record<string, string[]>)[effect.id] || [];
    let ok = true;
    effect.args.forEach((a: any, i: number) => {
      if (!ok) return;
      const tk = io.tokens[i];
      if (typeof a === 'string') {
        ok = sameArg(a, tk);
        return;
      }
      if (a && typeof a === 'object' && a.p != null) {
        const flag: string = a.flag || '';
        if (!tk.startsWith(flag)) {
          ok = false;
          return;
        }
        const v = tk.slice(flag.length);
        if (io.texts.has(v)) {
          if (!envCapable.includes(a.p)) {
            ok = false;
            return;
          }
          envs[a.p] = { vnorm: false, tnorm: false, text: io.texts.get(v)!.trim() };
          return;
        }
        if (!numeric(v)) {
          ok = false;
          return;
        }
        if (a.p in values && Number(values[a.p]) !== Number(v)) {
          ok = false;
          return;
        }
        values[a.p] = Number(v);
        return;
      }
      ok = false;
    });
    if (!ok) continue;
    // Every data file must have been absorbed as an envelope.
    if (io.texts.size !== Object.keys(envs).length) continue;

    // An enveloped param still needs a value; use its default.
    for (const name of Object.keys(envs)) {
      const p = effect.params.find((x: any) => x.name === name);
      values[name] = p ? p.default : 0;
    }
    // Confirm the template really regenerates this command line.
    const probe: Record<string, unknown> = { ...values };
    effect.args.forEach((a: any, i: number) => {
      if (a && typeof a === 'object' && a.p in envs) probe[a.p] = io.tokens[i].slice((a.flag || '').length);
    });
    const regenerated: string[] = buildArgs(effect, probe as Record<string, number>);
    if (regenerated.length !== io.tokens.length || regenerated.some((r, i) => !sameArg(String(r), io.tokens[i]))) continue;

    // Outside cdp-web's curated slider range: open the node unlocked.
    const unlocked = effect.params.some((p: any) => {
      if (!(p.name in values) || p.name in envs) return false;
      const v = Number(values[p.name]);
      return (p.min != null && v < p.min) || (p.max != null && v > p.max);
    });
    return { effect, values, envs, unlocked };
  }
  return null;
}

const DOLLAR_IN = ['$IN', '$IN2'];

/** Two spectra in one command must share an original sample type: if one has
 *  been through pvoc synth (float) and the other hasn't, give the other the
 *  same treatment. */
function matchSpectralFormats(
  g: GraphBuilder,
  inputs: StreamTok[],
  formatOf: (t: StreamTok) => SampleFormat,
): StreamTok[] {
  if (inputs.length < 2 || inputs.some((t) => t.domain !== 'spectral')) return inputs;
  const formats = inputs.map(formatOf);
  if (formats.every((f) => f === formats[0])) return inputs;
  return inputs.map((t, i) => (formats[i] === 'float' ? t : g.floatVersion(t)));
}

// Spectral outputs whose shape is lost when resynthesised and re-analysed:
// `spec grab` keeps a single analysis window, which e.g. `morph glide` needs.
const FRAGILE_SPECTRA: Record<string, string> = {
  'spec grab':
    'spec grab makes a one-window spectrum, which cdp-web resynthesises and re-analyses before the next Raw node',
};

function recordCall(
  g: GraphBuilder,
  program: string,
  rawTokens: string[],
  inputsByPath: Map<string, Tok>,
  outputs: { path: string; domain: Domain | null }[],
): Map<string, Tok> {
  const result = new Map<string, Tok>();
  const fail = (reason: string) => {
    for (const o of outputs) result.set(o.path, poison(reason));
    return result;
  };

  const usedPoison = [...inputsByPath.entries()].find(
    ([path, t]) => t.__tok === 'poison' && rawTokens.some((tk) => tk.includes(path)),
  );
  if (usedPoison) return fail((usedPoison[1] as PoisonTok).reason);

  const streamOuts = outputs.filter((o) => o.domain);
  const out = streamOuts[0];
  for (const o of outputs) {
    if (o !== out) {
      result.set(
        o.path,
        poison(
          o.domain
            ? `${program} writes several sound files; a cdp-web node passes on one`
            : `${program} passes a ${o.path.split('.').pop()} data file on, which cdp-web nodes can't do`,
        ),
      );
    }
  }
  if (!out) return result;

  // Normalise: stream inputs -> $IN/$IN2, stream output -> $OUT.
  const inputs: StreamTok[] = [];
  const inputSlot = new Map<string, number>();
  const texts = new Map<string, string>();
  const tokens = rawTokens.map((tk) => {
    if (tk === out.path) return '$OUT';
    const t = inputsByPath.get(tk);
    if (t?.__tok === 'stream') {
      if (!inputSlot.has(tk)) {
        inputSlot.set(tk, inputs.length);
        inputs.push(t);
      }
      return DOLLAR_IN[inputSlot.get(tk)!] ?? tk;
    }
    return tk;
  });
  for (const [path, t] of inputsByPath) {
    if (t.__tok === 'text' && rawTokens.some((tk) => tk.includes(path))) texts.set(path, t.text);
  }
  const fragile = inputs.find((t) => t.fragile && t.domain === 'spectral');
  if (fragile) return fail(fragile.fragile!);
  if (inputs.length === 0) {
    const viaData = [...inputsByPath.values()].some((t) => t.__tok === 'stream');
    return fail(
      viaData
        ? `${program} ${rawTokens[0] ?? ''} reads its sounds from a data file, which cdp-web can't wire up`
        : `${program} has no sound input`,
    );
  }
  if (inputs.length > 2) return fail(`${program} takes ${inputs.length} sound inputs; cdp-web nodes take at most two`);

  const io: CallIO = { tokens, inputs, texts, outDomain: out.domain! };
  const match = matchCatalog(program, io);
  if (match) {
    const want = match.effect.domain === 'spectral' ? 'spectral' : 'audio';
    const wired = want === 'spectral' ? matchSpectralFormats(g, inputs, (t) => g.formatOf(t.node)) : inputs;
    const id = g.effect(match.effect, match.values, match.envs, match.unlocked);
    wired.forEach((t, i) => g.edge(g.resolve(t, want), id, i === 0 ? 'in' : 'in2'));
    g.setFormat(id, g.formatOf(g.resolve(wired[0], want)));
    result.set(out.path, stream(id, out.domain!));
    return result;
  }

  // Raw CDP node: same command line. It always takes audio in and gives audio
  // out; $ANA/$OUTANA make it analyse / resynthesise around the program.
  if (texts.size > 1) {
    return fail(`${program} needs ${texts.size} data files; a cdp-web Raw node holds one`);
  }
  const [dataPath, dataText] = [...texts.entries()][0] ?? [null, ''];
  const rawArgs: string[] = [];
  for (const tk of tokens) {
    if (tk === '$OUT') rawArgs.push(out.domain === 'spectral' ? '$OUTANA' : '$OUT');
    else if (tk === '$IN' || tk === '$IN2') {
      const t = inputs[tk === '$IN' ? 0 : 1];
      rawArgs.push(t.domain === 'spectral' ? (tk === '$IN' ? '$ANA' : '$ANA2') : tk);
    } else if (dataPath && tk === dataPath) rawArgs.push('$DATA');
    else if (dataPath && tk.includes(dataPath)) {
      return fail(`${program} passes its data file inside a flag (${tk}), which a cdp-web Raw node can't fill in`);
    } else if (/\s/.test(tk)) {
      return fail(`${program} has an argument containing spaces`);
    } else rawArgs.push(tk);
  }
  const id = g.raw(program, rawArgs.join(' '), dataText, `${program} ${rawTokens[0] ?? ''}`.trim());
  // A Raw node analyses whatever audio it's given ($ANA), so the format that
  // counts is that of the sound arriving at its input.
  const wired = matchSpectralFormats(g, inputs, (t) => g.formatOf(g.peekAudio(t)));
  wired.forEach((t, i) => g.edge(g.resolve(t, 'audio'), id, i === 0 ? 'in' : 'in2'));
  g.setFormat(id, out.domain === 'spectral' ? 'float' : g.formatOf(g.resolve(wired[0], 'audio')));
  // A Raw node always resynthesises, so the node outputs audio; the token keeps
  // the snippet's view of it (.ana) so later spectral steps re-analyse it.
  const tok = stream(id, out.domain!);
  const fragileReason = FRAGILE_SPECTRA[`${program} ${rawTokens[0] ?? ''}`];
  if (fragileReason && out.domain === 'spectral') tok.fragile = fragileReason;
  result.set(out.path, tok);
  return result;
}

const extDomain = (path: string): Domain | null => {
  if (/\.wav$/i.test(path)) return 'audio';
  if (/\.ana$/i.test(path)) return 'spectral';
  return null;
};

const AsyncFunction: new (...args: string[]) => (...fnArgs: any[]) => Promise<any> = Object.getPrototypeOf(
  async function () {},
).constructor;

export interface BuildPatchOptions {
  title: string;
  description?: string;
  /** Absolute, CORS-enabled URL for a tutorial sound file. */
  audioUrl: (file: string) => string;
}

export async function buildCdpWebPatch(code: string, opts: BuildPatchOptions): Promise<CdpWebPatchResult> {
  const g = new GraphBuilder(opts.audioUrl);
  const omitted: { label: string; reason: string }[] = [];
  const emitted = new Set<Tok>();
  let outputCount = 0;

  const emit = (value: unknown, label?: string) => {
    const resolved =
      label?.trim() ||
      (outputCount + omitted.length === 0 ? 'Processed Output' : `Output ${outputCount + omitted.length + 1}`);
    const tok = isTok(value) ? value : poison('it is not the result of a CDP command');
    emitted.add(tok);
    if (tok.__tok !== 'stream') {
      omitted.push({ label: resolved, reason: tok.__tok === 'poison' ? tok.reason : 'it is a data file' });
      return;
    }
    const id = g.output(resolved);
    g.edge(g.resolve(tok, 'audio'), id);
    outputCount += 1;
  };

  const unwrap = (v: unknown): Tok => {
    if (isTok(v)) return v;
    if (v && typeof v === 'object' && 'bytes' in v && isTok((v as any).bytes)) return (v as any).bytes;
    return poison('it uses data computed in JavaScript');
  };

  const cdp = {
    async process(program: string, args: string[], input: unknown, o: any = {}) {
      const inTok = unwrap(input);
      const inExt = o.inExt || 'wav';
      const outExt = o.outExt || 'wav';
      const inputsByPath = new Map<string, Tok>();
      const inPath = `/__in.${inExt}`;
      const outPath = `/__out.${outExt}`;
      if (inTok.__tok === 'stream') {
        const want: Domain = inExt === 'ana' ? 'spectral' : 'audio';
        inputsByPath.set(inPath, inTok.domain === want ? inTok : poison(`${program} got the wrong kind of input`));
      } else inputsByPath.set(inPath, inTok);
      for (const [path, val] of Object.entries(o.extraInputs || {})) inputsByPath.set(path, unwrap(val));

      const tokens = args.map((a) => (a === '$IN' ? inPath : a === '$OUT' ? outPath : a));

      // The PVOC adapters: anal/synth with default settings map onto cdp-web's
      // own Analyse / Resynthesise nodes (which run exactly these commands).
      let tok: Tok;
      if (program === 'pvoc' && args.join(' ') === 'anal 1 $IN $OUT' && outExt === 'ana' && inTok.__tok === 'stream') {
        tok = inTok.domain === 'audio' ? { ...inTok, domain: 'spectral' } : poison('pvoc anal got spectral input');
      } else if (program === 'pvoc' && args.join(' ') === 'synth $IN $OUT' && inExt === 'ana' && inTok.__tok === 'stream') {
        tok = inTok.domain === 'spectral' ? { ...inTok, domain: 'audio' } : poison('pvoc synth got audio input');
      } else {
        const outDomain = outExt === 'ana' ? 'spectral' : outExt === 'wav' ? 'audio' : null;
        tok = recordCall(g, program, tokens, inputsByPath, [{ path: outPath, domain: outDomain }]).get(outPath)!;
      }
      return { bytes: tok, stdout: '', stderr: '', exitCode: 0, outputs: { [outPath]: tok } };
    },

    async run(program: string, args: string[], o: any = {}) {
      const inputsByPath = new Map<string, Tok>();
      for (const [path, val] of Object.entries(o.inputs || {})) {
        let t = unwrap(val);
        // A .ana path holding audio (or vice versa) can't be expressed.
        if (t.__tok === 'stream') {
          const d = extDomain(path);
          if (d && d !== t.domain) t = poison(`${program} got the wrong kind of input`);
        }
        inputsByPath.set(path, t);
      }
      const outPaths: string[] = o.outputs || [];
      // Console-only programs (sndinfo etc.) have no place in a patch.
      if (outPaths.length === 0) return { outputs: {}, stdout: '', stderr: '', exitCode: 0 };
      // Outputs not named in `outputs` still get written: keep their paths as-is.
      const outs = outPaths.map((path) => ({ path, domain: extDomain(path) }));
      const res = recordCall(g, program, args, inputsByPath, outs);
      return { outputs: Object.fromEntries(res), stdout: '', stderr: '', exitCode: 0 };
    },
  };

  const loadAudio = async (file: string) => g.source(file);
  const text = (content: string): TextTok => ({ __tok: 'text', text: String(content) });
  const log = () => {};

  const fn = new AsyncFunction('cdp', 'loadAudio', 'text', 'log', 'output', code);
  const ret = await fn(cdp, loadAudio, text, log, emit);
  const retTok = isTok(ret) ? ret : ret && typeof ret === 'object' && isTok((ret as any).bytes) ? (ret as any).bytes : null;
  if (retTok && !emitted.has(retTok)) emit(retTok);

  if (outputCount === 0) return { patch: null, omitted, outputCount };

  g.prune();
  g.layout();
  const notes = omitted.length
    ? `\n\nNot included (cdp-web can't express it): ${omitted.map((o) => `“${o.label}” — ${o.reason}`).join('; ')}.`
    : '';
  const patch = {
    app: 'cdp-web-patch',
    v: 1,
    view: { arrange: true, fit: true },
    metadata: {
      name: opts.title,
      description: `${opts.description ?? ''}${notes}`.trim(),
      category: 'CDP·WASM tutorials',
    },
    tempo: 120,
    nodes: g.nodes,
    edges: g.edges,
  };
  return { patch, omitted, outputCount };
}

async function deflateRawBase64Url(textIn: string): Promise<string> {
  const bytes = new TextEncoder().encode(textIn);
  const compressed = new Uint8Array(
    await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer(),
  );
  let bin = '';
  for (let i = 0; i < compressed.length; i += 0x8000) {
    bin += String.fromCharCode(...compressed.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** cdp-web share link: the whole patch travels in the URL fragment. */
export async function cdpWebPatchUrl(patch: Record<string, unknown>): Promise<string> {
  return `${CDP_WEB_URL}#patch=${await deflateRawBase64Url(JSON.stringify(patch))}`;
}
