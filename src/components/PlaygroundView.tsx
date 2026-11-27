import { useCallback, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  RotateCcw,
  Terminal,
} from 'lucide-react';
import { SOURCE_AUDIO_LIST, SOURCE_AUDIO_MAP } from '../data/sources';
import type { StepTelemetry } from '../engine/cdp-client';
import { runSnippet, type SnippetRunResult } from '../engine/snippet-runner';
import { CodeEditor } from './CodeEditor';
import { AudioComparePlayer } from './AudioComparePlayer';

interface PlaygroundPreset {
  id: string;
  label: string;
  description: string;
  defaultSource: string;
  buildCode: (sourceFile: string) => string;
}

const PLAYGROUND_PRESETS: PlaygroundPreset[] = [
  {
    id: 'speed-glide',
    label: 'Time-Varying Tape Glide',
    description: 'Smooth pitch/speed curve via modify speed 2 + inline .brk file',
    defaultSource: 'capm.wav',
    buildCode: (src) => `const src = await loadAudio('${src}');

// Breakpoint curve: time (seconds) -> transposition (semitones)
const curve = text(\`0.0   0
1.5  12
3.5 -12
6.0   0
\`);

const res = await cdp.run(
  'modify', ['speed', '2', '/in.wav', '/out.wav', '/curve.brk'],
  { inputs: { '/in.wav': src, '/curve.brk': curve }, outputs: ['/out.wav'] }
);

output(res.outputs['/out.wav'], 'Tape Glide (+12 -> -12 st)');`,
  },
  {
    id: 'spectral-blur-trace',
    label: 'PVOC Blur + Spectral Trace',
    description: 'Analyze into PVOC frames, smear partials with blur, keep top 12 loudest bins',
    defaultSource: 'count.wav',
    buildCode: (src) => `const src = await loadAudio('${src}');

// 1. Phase vocoder analysis
const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], src, { outExt: 'ana' });

// 2. Time-smear spectra over 40 windows
const blurred = await cdp.process('blur', ['blur', '$IN', '$OUT', '40'], ana.bytes, {
  inExt: 'ana',
  outExt: 'ana',
});

// 3. Retain only the 12 loudest spectral channels per window
const traced = await cdp.process('hilite', ['trace', '1', '$IN', '$OUT', '12'], blurred.bytes, {
  inExt: 'ana',
  outExt: 'ana',
});

// 4. Resynthesize back to audio
const out = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], traced.bytes, { inExt: 'ana' });
output(out.bytes, 'Blurred + 12-Partial Trace');`,
  },
  {
    id: 'chord-filter-bank',
    label: 'Chord-Tuned Filter Bank',
    description: 'Resonate any sound through a custom MIDI chord using filter userbank 2',
    defaultSource: 'trcdt.wav',
    buildCode: (src) => `const src = await loadAudio('${src}');

// Custom chord in MIDI note numbers + dB gain (D minor 9)
const chord = text(\`50  0dB
53  0dB
57  0dB
60  0dB
64  0dB
69  0dB
74  0dB
\`);
const qCurve = text('0.0 25\\n4.0 120\\n10.0 60\\n');

const res = await cdp.run(
  'filter', ['userbank', '2', '/in.wav', '/out.wav', '/chord.txt', '/q.brk', '15', '-d'],
  {
    inputs: { '/in.wav': src, '/chord.txt': chord, '/q.brk': qCurve },
    outputs: ['/out.wav'],
  }
);

output(res.outputs['/out.wav'], 'D Minor 9 Resonant Bank');`,
  },
  {
    id: 'spectral-vocode',
    label: 'Spectral Vocoder (2-Source)',
    description: 'Imprint vocal formants onto a broadband carrier via formants vocode',
    defaultSource: 'trcdt.wav',
    buildCode: (src) => `const carrier = await loadAudio('${src}');
const modulator = await loadAudio('vocalsnd.wav');

const carAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], carrier, { outExt: 'ana' });
const modAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], modulator, { outExt: 'ana' });

const voc = await cdp.run(
  'formants', ['vocode', '/car.ana', '/mod.ana', '/out.ana', '-p12', '-l100', '-h10000'],
  {
    inputs: { '/car.ana': carAna.bytes, '/mod.ana': modAna.bytes },
    outputs: ['/out.ana'],
  }
);

const out = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], voc.outputs['/out.ana'], { inExt: 'ana' });
output(out.bytes, 'Vocoded Hybrid');`,
  },
  {
    id: 'texture-cloud',
    label: 'TEXTURE Harmonic Cloud',
    description: 'Generate a 10-second polyphonic harmonic cloud with texture simple 3',
    defaultSource: 'marimba.wav',
    buildCode: (src) => `const src = await loadAudio('${src}');

// Harmonic field note-data file (C major 9 pitch set in MIDI)
const ndf = text(\`60
#5
0 1 60 0 0
0 1 64 0 0
0 1 67 0 0
0 1 71 0 0
0 1 74 0 0
\`);

const res = await cdp.run(
  'texture',
  [
    'simple', '3', '/in.wav', '/out.wav', '/ndf.txt',
    '10', '0.18', '0.08', '0', '1', '1',
    '48', '84', '0.5', '1.0', '55', '74', '0', '-s1',
  ],
  { inputs: { '/in.wav': src, '/ndf.txt': ndf }, outputs: ['/out.wav'] }
);

output(res.outputs['/out.wav'], 'C Maj9 Texture Cloud');`,
  },
  {
    id: 'blank',
    label: 'Blank Scratchpad',
    description: 'Minimal template ready for your own raw CDP-WASM chain',
    defaultSource: 'count.wav',
    buildCode: (src) => `const src = await loadAudio('${src}');

// Inspect source duration with sndinfo
const info = await cdp.run('sndinfo', ['len', '/in.wav'], { inputs: { '/in.wav': src } });
log(info.stdout.trim());

// Try any of CDP's 215 programs: modify, filter, distort, extend, pvoc, blur, focus, texture...
const out = await cdp.process('modify', ['speed', '2', '$IN', '$OUT', '-5'], src);
output(out.bytes, 'Down 5 Semitones');`,
  },
];

export function PlaygroundView() {
  const [selectedSource, setSelectedSource] = useState('capm.wav');
  const [activePresetId, setActivePresetId] = useState(PLAYGROUND_PRESETS[0].id);
  const [code, setCode] = useState(() => PLAYGROUND_PRESETS[0].buildCode('capm.wav'));
  const [running, setRunning] = useState(false);
  const [liveStep, setLiveStep] = useState<StepTelemetry | null>(null);
  const [result, setResult] = useState<SnippetRunResult | null>(null);
  const [showApiRef, setShowApiRef] = useState(false);

  const handleSelectPreset = (preset: PlaygroundPreset) => {
    setActivePresetId(preset.id);
    setSelectedSource(preset.defaultSource);
    setCode(preset.buildCode(preset.defaultSource));
    setResult(null);
  };

  const handleSourceChange = (file: string) => {
    setSelectedSource(file);
    // Replace first loadAudio('...') reference smoothly if user changes source picker
    setCode((prev) => prev.replace(/loadAudio\(['"][^'"]+['"]\)/, `loadAudio('${file}')`));
  };

  const handleReset = () => {
    const preset = PLAYGROUND_PRESETS.find((p) => p.id === activePresetId) ?? PLAYGROUND_PRESETS[0];
    setCode(preset.buildCode(selectedSource));
  };

  const handleRun = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setLiveStep(null);
    try {
      const res = await runSnippet(code, (step) => setLiveStep(step));
      setResult(res);
    } finally {
      setRunning(false);
      setLiveStep(null);
    }
  }, [code, running]);

  const sourceInfo = SOURCE_AUDIO_MAP[selectedSource];

  return (
    <div className="playground-view">
      <header className="lesson-hero">
        <div className="lesson-hero-meta">
          <span className="hero-module-num">Playground</span>
          <span className="hero-meta-sep">/</span>
          <span className="hero-category-label">215 CDP Programs</span>
        </div>
        <h1 className="lesson-title">Free CDP-WASM Playground</h1>
        <p className="lesson-subtitle">
          Pick any curated source sound, compose multi-step time-domain or PVOC spectral chains in live JavaScript, and inspect every transformation in waveform &amp; spectrogram view.
        </p>
      </header>

      <section className="playground-controls-bar">
        <div className="pg-control-group">
          <label className="pg-label" htmlFor="pg-source-select">
            Primary Source WAV
          </label>
          <select
            id="pg-source-select"
            className="pg-select"
            value={selectedSource}
            onChange={(e) => handleSourceChange(e.target.value)}
          >
            {SOURCE_AUDIO_LIST.map((s) => (
              <option key={s.file} value={s.file}>
                {s.file} — {s.label}
              </option>
            ))}
          </select>
          {sourceInfo && <p className="pg-source-note">{sourceInfo.description}</p>}
        </div>

        <div className="pg-control-group">
          <div className="pg-label">Starter Presets</div>
          <div className="pg-preset-chips">
            {PLAYGROUND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`pg-preset-chip ${activePresetId === preset.id ? 'active' : ''}`}
                onClick={() => handleSelectPreset(preset)}
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="api-ref-drawer">
        <button
          type="button"
          className="api-ref-toggle"
          onClick={() => setShowApiRef((v) => !v)}
          aria-expanded={showApiRef}
        >
          {showApiRef ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <BookOpen size={14} />
          <span>Snippet Runtime API Reference</span>
        </button>
        {showApiRef && (
          <div className="api-ref-grid">
            <div>
              <code>await loadAudio(&apos;count.wav&apos;)</code>
              <p>Loads any of the 16 curated source WAVs as a <code>Uint8Array</code>.</p>
            </div>
            <div>
              <code>text(&apos;0.0 -12\n3.0 12\n&apos;)</code>
              <p>Encodes inline <code>.brk</code>, <code>.txt</code>, <code>.tun</code>, or <code>.mix</code> text as UTF-8 bytes.</p>
            </div>
            <div>
              <code>await cdp.process(prog, args, bytes, opts?)</code>
              <p>Runs one-in/one-out CDP commands using <code>$IN</code>, <code>$OUT</code>, <code>$DATA</code>, plus <code>inExt</code>, <code>outExt</code>, <code>channels</code>, <code>extraInputs</code>.</p>
            </div>
            <div>
              <code>await cdp.run(prog, args, {'{ inputs, outputs, collect }'})</code>
              <p>Full raw CDP invocation with arbitrary virtual filesystem paths (e.g. <code>&apos;/in.wav&apos;</code>, <code>&apos;/out.wav&apos;</code>).</p>
            </div>
            <div>
              <code>await cdp.eachChannel(wav, async (mono) =&gt; out)</code>
              <p>Runs a mono-only chain per channel and recombines stereo/multichannel WAVs automatically.</p>
            </div>
            <div>
              <code>output(wavBytes, &apos;Label&apos;) / log(...)</code>
              <p>Sends one or more processed WAVs to the A/B waveform + spectrogram player, or prints text to the console.</p>
            </div>
          </div>
        )}
      </div>

      <div className="snippet-card playground-card">
        <div className="snippet-editor-section">
          <div className="editor-toolbar">
            <div className="editor-toolbar-left">
              <span className="editor-lang-tag">Playground · Async JS</span>
              {running && liveStep && (
                <span className="live-step-status">
                  <Loader2 size={12} className="spin" />
                  <code>{liveStep.program}</code>
                </span>
              )}
              {!running && result && !result.error && (
                <span className="run-telemetry">
                  <Check size={13} className="telemetry-ok" />
                  <span>
                    {result.steps.length} steps · {Math.round(result.totalDurationMs)} ms
                  </span>
                </span>
              )}
            </div>
            <div className="editor-toolbar-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleReset}
                disabled={running}
              >
                <RotateCcw size={13} />
                <span>Reset Preset</span>
              </button>
              <button
                type="button"
                className="btn-run"
                onClick={handleRun}
                disabled={running}
              >
                {running ? <Loader2 size={14} className="spin" /> : <Play size={14} fill="currentColor" />}
                <span>{running ? 'Processing…' : 'Run Chain'}</span>
                <kbd className="kbd-hint">⌘↵</kbd>
              </button>
            </div>
          </div>

          <CodeEditor value={code} onChange={setCode} onRun={handleRun} minHeight={260} />
        </div>

        {result?.error && (
          <div className="snippet-error-box" role="alert">
            <div className="snippet-error-title">
              <AlertCircle size={15} />
              <span>Execution Error</span>
            </div>
            <pre className="snippet-error-pre">{result.error}</pre>
          </div>
        )}

        <AudioComparePlayer
          snippetId={`playground-${activePresetId}`}
          sourceAudio={selectedSource}
          outputs={result?.outputs ?? []}
          defaultViewMode="both"
          spectrogramColorMap="grayscale"
        />

        {result && (result.steps.length > 0 || result.logs.length > 0) && (
          <div className="console-drawer">
            <div className="console-body">
              {result.steps.length > 0 && (
                <div className="console-block">
                  <div className="console-block-heading">
                    <Terminal size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Executed CDP Pipeline
                  </div>
                  <div className="cdp-command-list">
                    {result.steps.map((step, i) => (
                      <div key={i} className="cdp-command-item">
                        <div className="cdp-command-line">
                          <span className="cmd-index">{i + 1}</span>
                          <code className="cmd-text">$ {step.command}</code>
                          <span className="cmd-timing">
                            {step.cacheHit ? (
                              <span className="cache-hit-badge">cached</span>
                            ) : (
                              `${Math.round(step.durationMs)} ms`
                            )}
                          </span>
                        </div>
                        {(step.stdout.trim() || step.stderr.trim()) && (
                          <pre className="cmd-stdio">
                            {[step.stdout.trim(), step.stderr.trim()].filter(Boolean).join('\n')}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.logs.length > 0 && (
                <div className="console-block">
                  <div className="console-block-heading">Console Output</div>
                  <pre className="console-log-pre">{result.logs.join('\n')}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
