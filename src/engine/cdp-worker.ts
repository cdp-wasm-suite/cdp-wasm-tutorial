import { CDP } from 'cdp-wasm';
import { decodeAudio, decodeWav, encodeWav, wavFrameCount } from 'cdp-wasm/wav';

interface RunRequest {
  type: 'run';
  id: number;
  program: string;
  args: string[];
  io?: {
    inputs?: Record<string, Uint8Array>;
    outputs?: string[];
    collect?: { prefix: string; ext?: string }[];
  };
  noCache?: boolean;
}

interface ProcessRequest {
  type: 'process';
  id: number;
  program: string;
  args: string[];
  inputBytes: Uint8Array;
  opts?: {
    inExt?: string;
    outExt?: string;
    channels?: 'split' | 'mix';
    data?: string | Uint8Array;
    extraInputs?: Record<string, Uint8Array>;
  };
  noCache?: boolean;
}

interface InitRequest {
  type: 'init';
  id: number;
  baseUrl: string;
}

interface ClearCacheRequest {
  type: 'clearCache';
  id: number;
}

type WorkerRequest = InitRequest | RunRequest | ProcessRequest | ClearCacheRequest;

interface CachedRunEntry {
  exitCode: number;
  stdout: string;
  stderr: string;
  outputs: Record<string, Uint8Array>;
  sizeBytes: number;
}

let cdp: CDP | null = null;

// Content-addressed LRU cache (FNV-1a 64-bit split hash) so repeated expensive
// steps such as `pvoc anal` return instantaneously across runs and snippets.
const cache = new Map<string, CachedRunEntry>();
let cacheBytes = 0;
const CACHE_BUDGET_BYTES = 256 * 1024 * 1024;

function fnv1aString(str: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function fnv1aBytes(bytes: Uint8Array): string {
  // Dual-lane FNV-1a (length + full content) for fast, collision-resistant hashing
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const len = bytes.byteLength;
  h1 = Math.imul(h1 ^ len, 0x01000193);
  h2 = Math.imul(h2 ^ (len >>> 1), 0x01000193);
  for (let i = 0; i < len; i++) {
    const b = bytes[i];
    h1 = Math.imul(h1 ^ b, 0x01000193);
    h2 = Math.imul(h2 ^ (b + (i & 255)), 0x01000193);
  }
  return `${len}:${(h1 >>> 0).toString(36)}-${(h2 >>> 0).toString(36)}`;
}

function computeRunKey(
  program: string,
  args: string[],
  io?: {
    inputs?: Record<string, Uint8Array>;
    outputs?: string[];
    collect?: { prefix: string; ext?: string }[];
  }
): string {
  const parts: string[] = [
    program,
    args.join('\u0000'),
    (io?.outputs || []).join('\u0000'),
    (io?.collect || []).map((c) => `${c.prefix}.${c.ext || 'wav'}`).join('\u0000'),
  ];
  const entries = Object.entries(io?.inputs || {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [path, bytes] of entries) {
    parts.push(`${path}=${fnv1aBytes(bytes)}`);
  }
  const combined = parts.join('\u0001');
  const h1 = fnv1aString(combined, 0x811c9dc5).toString(36);
  const h2 = fnv1aString(combined, 0x9e3779b9).toString(36);
  return `${program}:${h1}:${h2}:${combined.length}`;
}

function touchCache(key: string): CachedRunEntry | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

function storeCache(key: string, entry: CachedRunEntry): void {
  if (entry.sizeBytes > CACHE_BUDGET_BYTES / 2) return;
  const existing = cache.get(key);
  if (existing) {
    cacheBytes -= existing.sizeBytes;
    cache.delete(key);
  }
  cache.set(key, entry);
  cacheBytes += entry.sizeBytes;
  while (cacheBytes > CACHE_BUDGET_BYTES && cache.size > 1) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    const oldest = cache.get(oldestKey);
    if (oldest) cacheBytes -= oldest.sizeBytes;
    cache.delete(oldestKey);
  }
}

function formatCdpError(program: string, args: string[], exitCode: number, stdout: string, stderr: string, note?: string): string {
  const cmd = `${program} ${args.join(' ')}`.trim();
  const detail = [stderr.trim(), stdout.trim()].filter(Boolean).join('\n');
  const lines = [
    `CDP error running: ${cmd}`,
    note ? `${note} (exit code ${exitCode})` : `Exit code: ${exitCode}`,
  ];
  if (detail) lines.push(detail);
  return lines.join('\n');
}

function validateOutputs(
  program: string,
  args: string[],
  exitCode: number,
  stdout: string,
  stderr: string,
  outputs: Record<string, Uint8Array>,
  expectedOutputs?: string[]
): void {
  if (exitCode !== 0) {
    throw new Error(formatCdpError(program, args, exitCode, stdout, stderr));
  }
  for (const outPath of expectedOutputs || []) {
    const bytes = outputs[outPath];
    if (!bytes || bytes.byteLength === 0) {
      throw new Error(
        formatCdpError(program, args, exitCode, stdout, stderr, `Expected output "${outPath}" was not produced or is empty`)
      );
    }
    if (outPath.toLowerCase().endsWith('.wav')) {
      const frames = wavFrameCount(bytes);
      if (frames <= 0) {
        throw new Error(
          formatCdpError(program, args, exitCode, stdout, stderr, `Output WAV "${outPath}" has 0 audio frames`)
        );
      }
      // Verify header parses cleanly via decodeWav
      try {
        const dec = decodeWav(bytes);
        if (dec.length <= 0) {
          throw new Error('0 decoded frames');
        }
      } catch (err) {
        throw new Error(
          formatCdpError(
            program,
            args,
            exitCode,
            stdout,
            stderr,
            `Output WAV "${outPath}" failed validation: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      }
    }
  }
  // Also validate any collected .wav outputs
  for (const [outPath, bytes] of Object.entries(outputs)) {
    if (outPath.toLowerCase().endsWith('.wav') && (!bytes || wavFrameCount(bytes) <= 0)) {
      throw new Error(
        formatCdpError(program, args, exitCode, stdout, stderr, `Collected WAV "${outPath}" has 0 audio frames`)
      );
    }
  }
}

async function execRunCached(
  program: string,
  args: string[],
  io: {
    inputs?: Record<string, Uint8Array>;
    outputs?: string[];
    collect?: { prefix: string; ext?: string }[];
  } = {},
  noCache = false
) {
  if (!cdp) throw new Error('CDP worker is not initialized.');
  const command = `${program} ${args.join(' ')}`.trim();
  const key = computeRunKey(program, args, io);
  const t0 = performance.now();

  if (!noCache) {
    const cached = touchCache(key);
    if (cached) {
      const clonedOutputs: Record<string, Uint8Array> = {};
      for (const [k, v] of Object.entries(cached.outputs)) {
        clonedOutputs[k] = v.slice();
      }
      return {
        exitCode: cached.exitCode,
        stdout: cached.stdout,
        stderr: cached.stderr,
        outputs: clonedOutputs,
        durationMs: Math.max(0.1, performance.now() - t0),
        cacheHit: true,
        command,
      };
    }
  }

  const res = await cdp.run(program, args, io);
  validateOutputs(program, args, res.exitCode, res.stdout, res.stderr, res.outputs, io.outputs);

  let sizeBytes = 0;
  const cachedOutputs: Record<string, Uint8Array> = {};
  const returnOutputs: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(res.outputs)) {
    sizeBytes += v.byteLength;
    cachedOutputs[k] = v;
    returnOutputs[k] = v.slice();
  }

  storeCache(key, {
    exitCode: res.exitCode,
    stdout: res.stdout,
    stderr: res.stderr,
    outputs: cachedOutputs,
    sizeBytes,
  });

  return {
    exitCode: res.exitCode,
    stdout: res.stdout,
    stderr: res.stderr,
    outputs: returnOutputs,
    durationMs: performance.now() - t0,
    cacheHit: false,
    command,
  };
}

function mixToMonoWav(inputBytes: Uint8Array): Uint8Array {
  const dec = decodeAudio(inputBytes);
  if (dec.numChannels <= 1) return inputBytes;
  const mono = new Float32Array(dec.length);
  for (let c = 0; c < dec.numChannels; c++) {
    const ch = dec.channelData[c];
    for (let i = 0; i < dec.length; i++) {
      mono[i] += ch[i] / dec.numChannels;
    }
  }
  return encodeWav({ sampleRate: dec.sampleRate, channelData: [mono] });
}

async function execProcessCached(
  program: string,
  args: string[],
  inputBytes: Uint8Array,
  opts: ProcessRequest['opts'] = {},
  noCache = false
) {
  const { inExt = 'wav', outExt = 'wav', channels, data, extraInputs } = opts;

  if (channels && inExt.toLowerCase() === 'wav' && outExt.toLowerCase() === 'wav') {
    const dec = decodeAudio(inputBytes);
    if (dec.numChannels > 1) {
      if (channels === 'mix') {
        inputBytes = mixToMonoWav(inputBytes);
      } else if (channels === 'split') {
        const t0 = performance.now();
        const decodedOuts = [];
        let combinedStdout = '';
        let combinedStderr = '';
        let allHits = true;
        for (let c = 0; c < dec.numChannels; c++) {
          const monoWav = encodeWav({ sampleRate: dec.sampleRate, channelData: [dec.channelData[c]] });
          const chRes = await execProcessCached(
            program,
            args,
            monoWav,
            { inExt, outExt, data, extraInputs },
            noCache
          );
          decodedOuts.push(decodeWav(chRes.bytes));
          if (chRes.stdout.trim()) combinedStdout += `[ch${c + 1}] ${chRes.stdout.trim()}\n`;
          if (chRes.stderr.trim()) combinedStderr += `[ch${c + 1}] ${chRes.stderr.trim()}\n`;
          if (!chRes.cacheHit) allHits = false;
        }
        const length = Math.max(...decodedOuts.map((o) => o.length));
        const channelData = decodedOuts.map((o) => {
          if (o.length === length) return o.channelData[0];
          const padded = new Float32Array(length);
          padded.set(o.channelData[0]);
          return padded;
        });
        const recombined = encodeWav({ sampleRate: decodedOuts[0].sampleRate, channelData });
        const inPath = `/in.${inExt}`;
        const outPath = `/out.${outExt}`;
        const dataPath = '/data.txt';
        const mapped = args.map((a) => (a === '$IN' ? inPath : a === '$OUT' ? outPath : a === '$DATA' ? dataPath : a));
        return {
          bytes: recombined,
          stdout: combinedStdout,
          stderr: combinedStderr,
          exitCode: 0,
          durationMs: performance.now() - t0,
          cacheHit: allHits,
          command: `${program} ${mapped.join(' ')} (split ${dec.numChannels}ch)`,
        };
      }
    }
  }

  const inPath = `/in.${inExt}`;
  const outPath = `/out.${outExt}`;
  const dataPath = '/data.txt';
  const inputs: Record<string, Uint8Array> = {
    [inPath]: inputBytes,
    ...(extraInputs || {}),
  };
  if (data != null) {
    inputs[dataPath] = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  }
  const mapped = args.map((a) =>
    a === '$IN' ? inPath : a === '$OUT' ? outPath : a === '$DATA' ? dataPath : a
  );
  const res = await execRunCached(program, mapped, { inputs, outputs: [outPath] }, noCache);
  const bytes = res.outputs[outPath];
  if (!bytes) {
    throw new Error(formatCdpError(program, mapped, res.exitCode, res.stdout, res.stderr, 'No output file produced'));
  }
  return {
    bytes,
    stdout: res.stdout,
    stderr: res.stderr,
    exitCode: res.exitCode,
    durationMs: res.durationMs,
    cacheHit: res.cacheHit,
    command: res.command,
  };
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === 'init') {
      cdp = new CDP({ baseUrl: msg.baseUrl });
      self.postMessage({ type: 'ok', id: msg.id });
      return;
    }

    if (msg.type === 'clearCache') {
      cache.clear();
      cacheBytes = 0;
      self.postMessage({ type: 'ok', id: msg.id });
      return;
    }

    if (msg.type === 'run') {
      const result = await execRunCached(msg.program, msg.args, msg.io, msg.noCache);
      const transfer: Transferable[] = Object.values(result.outputs).map((u) => u.buffer);
      self.postMessage({ type: 'runResult', id: msg.id, result }, { transfer });
      return;
    }

    if (msg.type === 'process') {
      const result = await execProcessCached(msg.program, msg.args, msg.inputBytes, msg.opts, msg.noCache);
      self.postMessage({ type: 'processResult', id: msg.id, result }, { transfer: [result.bytes.buffer] });
      return;
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      id: msg.id,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
