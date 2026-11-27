import type { TutorialModule } from '../../types';

export const mod8Texture: TutorialModule = {
  id: 'mod8-texture',
  number: 8,
  title: 'Composing with TEXTURE & Multi-Layer Mixing',
  subtitle: 'Generating clouds, harmonic fields, rhythmic templates, and melodic motifs from single sounds—then mixing and transforming them into full pieces',
  category: 'Composition & Synthesis',
  visualFocus: 'both',
  overview: [
    'CDP’s `texture` engine turns one or more mono source sounds into entire musical fabrics—from sparse pointillist clouds and breathing harmonic washes to strict rhythmic patterns and interlocking melodic motifs—driven by compact plain-text note-data files and breakpoint curves.',
    'In this capstone module you will master `texture simple` (including CDP 7’s trailing `omit` parameter), harmonic grids and progressions (Modes 3 and 4), rhythmic templates and motifs (`timed`, `motifs`, `tmotifs`), multi-voice stereo mixing with `submix mix`, and a complete end-to-end multi-domain composition chain uniting time-domain texture generation, spectral blurring/tracing, and varispeed pitch transposition.',
  ],
  sources: ['marimba.wav', 'gtrcdt.wav', 'cymcdt.wav', 'dingcdt.wav', 'capm.wav'],
  sections: [
    {
      id: 'm8-scatter-density',
      heading: 'Clouds, Scatter & Time-Varying Density (texture simple)',
      prose: [
        '`texture simple` is the gateway to CDP’s algorithmic texture family. Given a mono source sound and a note-data file specifying the source’s reference MIDI pitch (typically `60`), it scatters transposed, gain-varied, stereo-panned copies across a chosen output duration. In Mode 5 (free pitch range without a harmonic grid), events draw pitches freely between `pitchLo` and `pitchHi`.',
        'Every `texture simple` call ends with a trailing `omit` count before the flags (`0` disables event omission, preserving every generated event). Passing a breakpoint curve for the `packing` parameter (time between successive event attacks) lets a texture breathe—thinning out into isolated cymbal strokes, accelerating into a dense shimmer, and receding again.',
      ],
      tip: 'In Waveform view, compare the steady evenly-spaced marimba pulse against the cymbal cloud driven by `pksym.brk`: you can literally see the event density swell toward the 10-second midpoint and taper symmetrically back out.',
      examples: [
        {
          id: 'm8-simple-packing',
          title: 'Scattered Marimba & Breathing Cymbal Density',
          summary: 'Generate a regular marimba pulse and a time-varying suspended-cymbal wash with `texture simple 5`, controlling attack spacing via an inline `.brk` curve.',
          legacyOrigin: 'Workshop 2 — Example 1 & Worksheet 6 (ST4–ST6)',
          programs: ['texture'],
          sourceAudio: 'marimba.wav',
          extraSources: ['cymcdt.wav'],
          defaultViewMode: 'waveform',
          spectrogramColorMap: 'inferno',
          code: `const marimba = await loadAudio('marimba.wav');
const cymbal = await loadAudio('cymcdt.wav');

// Minimal note-data file: source reference pitch = MIDI 60 (C4)
const ndf = text('60\\n');

// 1. Steady scattered marimba pulses (10 s, pack 0.5 s, scatter 0.15, pitch 60..60, omit=0)
// Args: simple mode in out ndf dur pack scatter tgrid sndLo sndHi gainLo gainHi durLo durHi pchLo pchHi omit [flags]
const tx1 = await cdp.run(
  'texture',
  [
    'simple', '5', '/in.wav', '/out.wav', '/ndf.txt',
    '10', '0.5', '0.15', '0', '1', '1', '40', '80', '0.5', '0.7', '60', '60', '0',
    '-p0.5', '-s1',
  ],
  { inputs: { '/in.wav': marimba, '/ndf.txt': ndf }, outputs: ['/out.wav'] }
);
output(tx1.outputs['/out.wav'], '1. Marimba pulse (pack 0.5 s, scatter 0.15)');

// 2. Time-varying packing curve: slow -> sparse -> dense (0.5 s) -> sparse -> slow
const packCurve = text([
  '0   1.0',
  '5   2.0',
  '10  0.5',
  '15  2.0',
  '20  1.0',
].join('\\n') + '\\n');

// Cymbal wash across an octave (MIDI 55..67), -w plays whole source each event
const tx2 = await cdp.run(
  'texture',
  [
    'simple', '5', '/in.wav', '/out.wav', '/ndf.txt',
    '20', '/pksym.brk', '0.01', '0', '1', '1', '94', '104', '1.5', '1.5', '55', '67', '0',
    '-s1', '-w',
  ],
  {
    inputs: { '/in.wav': cymbal, '/ndf.txt': ndf, '/pksym.brk': packCurve },
    outputs: ['/out.wav'],
  }
);
output(tx2.outputs['/out.wav'], '2. Cymbal cloud (time-varying packing, MIDI 55-67)');

log('Rendered fixed-packing marimba pulse and breathing cymbal texture.');`,
          tryThis: [
            'Widen the marimba pitch range from `60 60` to `48 72` (two octaves) and reduce packing from `0.5` to `0.12` for a sparkling cascade.',
            'Change the midpoint of `packCurve` (`10 0.5`) to `10 0.12` for a dramatic dense climax in the cymbal wash.',
            'Remove `-w` from the cymbal texture so each event is truncated to `1.5` seconds instead of ringing out completely.',
          ],
        },
      ],
    },
    {
      id: 'm8-harmony',
      heading: 'Harmonic Grids & Changing Harmonic Fields',
      prose: [
        'Switching `texture simple` from Mode 5 to Mode 3 locks every generated event onto a fixed harmonic set defined inside the note-data file. After the reference pitch line (`60`), a `#N` header declares `N` chord tones, each given as `time input_index midi_pitch amp dur` (for static harmonic sets, `time`, `amp`, and `dur` stay `0`).',
        'Mode 4 unlocks time-varying harmonic progressions: each line in the note-data file carries a timestamp in seconds specifying when the available harmonic pitches change. Using a clearly pitched metallic source like `dingcdt.wav` makes the emerging melodic outline unmistakable in both ear and spectrogram.',
      ],
      tip: 'In the spectrogram of Output 2 (`dingcdt.wav` with Mode 4), watch the bright horizontal partial bands step deliberately upward and downward across the 20-second timeline as the harmonic set shifts.',
      examples: [
        {
          id: 'm8-harmonic-grids',
          title: 'Fixed C7th Wash & Time-Varying Harmonic Progression',
          summary: 'Lock a cymbal wash onto a C7th chord (`texture simple 3`), then steer a pitched metallic chime across a 12-step changing harmonic field (`texture simple 4`).',
          legacyOrigin: 'Workshop 1 — Worksheet 6 (ST8–ST9)',
          programs: ['texture'],
          sourceAudio: 'cymcdt.wav',
          extraSources: ['dingcdt.wav'],
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'viridis',
          code: `const cymbal = await loadAudio('cymcdt.wav');
const ding = await loadAudio('dingcdt.wav');

// 1. Fixed C7th harmonic set: G3 (55), C4 (60), E4 (64), Bb4 (70)
const ndfC7th = text([
  '60',
  '#4',
  '0 1 55 0 0',
  '0 1 60 0 0',
  '0 1 64 0 0',
  '0 1 70 0 0',
].join('\\n') + '\\n');

// Mode 3 = fixed harmonic set; fast 0.25 s packing fuses cymbal hits into a chordal wash
const wash = await cdp.run(
  'texture',
  [
    'simple', '3', '/in.wav', '/out.wav', '/ndf.txt',
    '14', '0.25', '0.01', '0', '1', '1', '94', '104', '1.5', '1.5', '55', '70', '0',
    '-s1', '-w',
  ],
  { inputs: { '/in.wav': cymbal, '/ndf.txt': ndfC7th }, outputs: ['/out.wav'] }
);
output(wash.outputs['/out.wav'], '1. Mode 3: C7th cymbal wash (pack 0.25 s)');

// 2. Time-varying harmonic sets: 12 time-stamped pitches tracing a melodic contour
const ndfChanging = text([
  '60',
  '#12',
  '0  1 55 0 0',
  '1  1 60 0 0',
  '3  1 55 0 0',
  '4  1 64 0 0',
  '6  1 55 0 0',
  '7  1 70 0 0',
  '10 1 72 0 0',
  '11 1 70 0 0',
  '13 1 72 0 0',
  '14 1 64 0 0',
  '16 1 72 0 0',
  '17 1 60 0 0',
].join('\\n') + '\\n');

// Mode 4 = changing harmonic set applied to pitched saucepan lid (dingcdt.wav)
const melody = await cdp.run(
  'texture',
  [
    'simple', '4', '/in.wav', '/out.wav', '/ndf.txt',
    '20', '0.25', '0.01', '0', '1', '1', '94', '104', '1.5', '1.5', '55', '72', '0',
    '-s1', '-w',
  ],
  { inputs: { '/in.wav': ding, '/ndf.txt': ndfChanging }, outputs: ['/out.wav'] }
);
output(melody.outputs['/out.wav'], '2. Mode 4: Changing harmonic melody on dingcdt.wav');

log('Rendered fixed C7th harmonic grid and 12-point changing harmonic field.');`,
          tryThis: [
            'Edit `ndfC7th` from `55 60 64 70` (C7) to `57 60 64 69` (A minor) or `60 62 67 69 72` (pentatonic).',
            'Swap `cymcdt.wav` and `dingcdt.wav` between the two runs to hear how source pitch clarity changes chord perception.',
            'Add a second simultaneous note at the same timestamp in `ndfChanging` (and increment `#12` accordingly) to turn single-note steps into moving dyads.',
          ],
        },
      ],
    },
    {
      id: 'm8-rhythms-motifs',
      heading: 'Rhythmic Templates & Melodic Motifs',
      prose: [
        'Beyond free clouds, `texture` includes dedicated sub-programs for structured rhythm and counterpoint. `texture timed` replaces random packing with a looping rhythmic template declared in the note-data file (six event onset times in seconds), while a spatial breakpoint file (`-p/ps.brk`) sweeps the stereo position across the phrase.',
        '`texture motifs` fires complete multi-note melodic phrases (each `#N` block defines onset time, input index, MIDI pitch, loudness, and duration) across a texture field—here juxtaposing two contrasting 10-note contours with a sustained pedal note. Combining both ideas, `texture tmotifs` triggers a rapid 14-note trill-and-arpeggio guitar motif strictly on the beats of an 11-point rhythmic template.',
      ],
      tip: 'Look at the Waveform view of Output 1 (`texture timed`) and Output 3 (`texture tmotifs`): unlike random scatter, the sharp transient clusters repeat in tight, recognisable rhythmic cells.',
      examples: [
        {
          id: 'm8-timed-and-motifs',
          title: 'Rhythmic Templates, Melodic Motifs & Timed Motifs',
          summary: 'Compare three structured composition engines—`texture timed 5`, `texture motifs 5`, and `texture tmotifs 5`—using marimba and guitar sources.',
          legacyOrigin: 'Workshop 2 — Examples 2, 7 & 8',
          programs: ['texture'],
          sourceAudio: 'marimba.wav',
          extraSources: ['gtrcdt.wav'],
          defaultViewMode: 'both',
          spectrogramColorMap: 'inferno',
          code: `const marimba = await loadAudio('marimba.wav');
const guitar = await loadAudio('gtrcdt.wav');

// 1. texture timed 5: 6-onset rhythmic template + stereo pan sweep
const timedNdf = text([
  '60',
  '#6',
  '0.00 1 0 0 0',
  '0.17 1 0 0 0',
  '0.34 1 0 0 0',
  '0.50 1 0 0 0',
  '1.25 1 0 0 0',
  '1.75 1 0 0 0',
].join('\\n') + '\\n');
const panSweep = text('0.0 0\\n5.0 1\\n10.0 0\\n');

const timedRes = await cdp.run(
  'texture',
  [
    'timed', '5', '/in.wav', '/out.wav', '/ndf.txt',
    '12', '1.25', '1', '1', '40', '80', '0.5', '1.0', '60', '72',
    '-p/ps.brk', '-s1',
  ],
  {
    inputs: { '/in.wav': marimba, '/ndf.txt': timedNdf, '/ps.brk': panSweep },
    outputs: ['/out.wav'],
  }
);
output(timedRes.outputs['/out.wav'], '1. texture timed 5 (marimba rhythmic cell)');

// 2. texture motifs 5: two inverted 10-note melodic motifs + pedal tone
const motifsNdf = text([
  '60',
  '#10',
  '0.00 1 60 84 0.3',
  '0.17 1 71 70 0.3',
  '0.34 1 65 74 0.3',
  '0.50 1 67 56 0.3',
  '0.67 1 61 74 0.3',
  '0.84 1 62 60 0.3',
  '1.00 1 68 84 0.3',
  '1.17 1 66 60 0.3',
  '1.34 1 70 66 0.3',
  '1.50 1 64 78 0.3',
  '#1',
  '0.00 1 60 60 2.0',
  '#10',
  '0.00 1 60 84 0.3',
  '0.17 1 49 70 0.3',
  '0.34 1 55 74 0.3',
  '0.50 1 53 56 0.3',
  '0.67 1 59 74 0.3',
  '0.84 1 58 60 0.3',
  '1.00 1 52 84 0.3',
  '1.17 1 54 60 0.3',
  '1.34 1 50 66 0.3',
  '1.50 1 56 78 0.3',
].join('\\n') + '\\n');

const motifsRes = await cdp.run(
  'texture',
  [
    'motifs', '5', '/in.wav', '/out.wav', '/ndf.txt',
    '12', '0.25', '0', '0', '1', '1', '56', '84', '57', '64',
    '0', '0', '1', '0', '0', '0.5', '0.5', '-a0.8', '-p0.5', '-s1',
  ],
  { inputs: { '/in.wav': marimba, '/ndf.txt': motifsNdf }, outputs: ['/out.wav'] }
);
output(motifsRes.outputs['/out.wav'], '2. texture motifs 5 (contrapuntal marimba motifs)');

// 3. texture tmotifs 5: 11-point rhythm template driving a 14-note guitar trill motif
const tmotifsNdf = text([
  '60',
  '#11',
  '0.00 1 0 0 0',
  '1.00 1 0 0 0',
  '1.50 1 0 0 0',
  '6.00 1 0 0 0',
  '6.25 1 0 0 0',
  '6.50 1 0 0 0',
  '6.75 1 0 0 0',
  '7.00 1 0 0 0',
  '8.00 1 0 0 0',
  '9.00 1 0 0 0',
  '11.0 1 0 0 0',
  '#14',
  '0.00 1 60 84 0.4',
  '0.10 1 61 80 0.4',
  '0.20 1 60 76 0.4',
  '0.30 1 61 72 0.4',
  '0.40 1 60 68 0.4',
  '0.50 1 61 76 0.4',
  '0.60 1 60 72 0.4',
  '0.70 1 61 68 0.4',
  '0.80 1 60 64 0.4',
  '0.90 1 61 60 0.4',
  '1.00 1 60 84 0.5',
  '1.25 1 63 72 0.5',
  '1.50 1 66 78 0.5',
  '1.75 1 64 72 0.5',
].join('\\n') + '\\n');

const tmotifsRes = await cdp.run(
  'texture',
  [
    'tmotifs', '5', '/in.wav', '/out.wav', '/ndf.txt',
    '12', '1.0', '1', '1', '60', '84', '55', '72',
    '0', '0', '1', '0', '0', '0.5', '0.5', '-a0.8', '-p0.5', '-s1',
  ],
  { inputs: { '/in.wav': guitar, '/ndf.txt': tmotifsNdf }, outputs: ['/out.wav'] }
);
output(tmotifsRes.outputs['/out.wav'], '3. texture tmotifs 5 (timed guitar trill motif)');

log('Rendered timed rhythm, melodic motifs, and timed guitar motifs.');`,
          tryThis: [
            'In `texture timed 5`, narrow the pitch range from `60 72` to `60 60` to isolate the pure rhythmic pulse and pan sweep.',
            'In `motifsNdf`, speed up the 10-note motif by halving its timestamps (`0.00`, `0.08`, `0.17`, …) for rapid ornamental flourishes.',
            'In `tmotifsRes`, change the time-multiplier `1.0` (second numeric arg after `/ndf.txt`) to `0.6` to compress the entire rhythmic template.',
          ],
        },
      ],
    },
    {
      id: 'm8-mixing',
      heading: 'Multi-Voice Spectral Chorus & submix mix',
      prose: [
        'Composing with CDP often means generating several related layers and assembling them precisely in time and stereo space. `submix mix` reads a plain-text `.mix` file where each line specifies `filename  start_time  channels  level  pan` (with pan ranging from `-1` hard left through `0` centre to `+1` hard right).',
        'Here we analyse a male voice (`capm.wav`), derive two formant-preserved harmonies (`repitch transposef 3 -f4` down 2 semitones and up 2 semitones—keeping the exact duration of the original), and combine all three voices via `submix mix`. Comparing synchronous entry (`0 / 0 / 0 s`) against a 100 ms staggered entry (`0 / 0.1 / 0.2 s`) transforms a dense three-part cluster into a wide, bouncing spatial canon.',
      ],
      tip: 'Listen on headphones to hear the three vocal layers spread cleanly across Left (-2 st), Centre (original), and Right (+2 st), and notice how just 0.1 s of offset dramatically increases clarity.',
      examples: [
        {
          id: 'm8-voice-chorus-mix',
          title: 'Three-Voice Spectral Chorus & Spatial Canon (submix mix)',
          summary: 'Create ±2 semitone formant-preserved vocal harmonies and mix all three voices into stereo using inline `.mix` files—both synchronously and with 0.1 s offsets.',
          legacyOrigin: 'Workshop 1 — Worksheet 4 (ST11)',
          programs: ['pvoc', 'repitch', 'submix'],
          sourceAudio: 'capm.wav',
          defaultViewMode: 'both',
          spectrogramColorMap: 'magma',
          code: `const dry = await loadAudio('capm.wav');
const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], dry, { outExt: 'ana' });

// Generate -2 st and +2 st formant-preserved harmony voices (-f4)
const lowAna = await cdp.process(
  'repitch',
  ['transposef', '3', '$IN', '$OUT', '-f4', '-2'],
  ana.bytes,
  { inExt: 'ana', outExt: 'ana' }
);
const highAna = await cdp.process(
  'repitch',
  ['transposef', '3', '$IN', '$OUT', '-f4', '2'],
  ana.bytes,
  { inExt: 'ana', outExt: 'ana' }
);

const lowWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], lowAna.bytes, { inExt: 'ana' });
const highWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], highAna.bytes, { inExt: 'ana' });

// 1. Synchronous 3-voice stereo mix: filename  start  ch  gain  pan
const syncMix = text([
  '/capmd2.wav  0.0  1  0.5  -1',
  '/capm.wav    0.0  1  0.4   0',
  '/capmu2.wav  0.0  1  0.5   1',
].join('\\n') + '\\n');

const syncRes = await cdp.run(
  'submix',
  ['mix', '/voices.mix', '/out.wav'],
  {
    inputs: {
      '/capmd2.wav': lowWav.bytes,
      '/capm.wav': dry,
      '/capmu2.wav': highWav.bytes,
      '/voices.mix': syncMix,
    },
    outputs: ['/out.wav'],
  }
);
output(syncRes.outputs['/out.wav'], '1. Synchronous 3-voice chorus (-2 / 0 / +2 st)');

// 2. Staggered 0.1 s spatial canon across L -> C -> R
const offsetMix = text([
  '/capmd2.wav  0.0  1  0.5  -1',
  '/capm.wav    0.1  1  0.4   0',
  '/capmu2.wav  0.2  1  0.5   1',
].join('\\n') + '\\n');

const offsetRes = await cdp.run(
  'submix',
  ['mix', '/voices.mix', '/out.wav'],
  {
    inputs: {
      '/capmd2.wav': lowWav.bytes,
      '/capm.wav': dry,
      '/capmu2.wav': highWav.bytes,
      '/voices.mix': offsetMix,
    },
    outputs: ['/out.wav'],
  }
);
output(offsetRes.outputs['/out.wav'], '2. Staggered spatial canon (0 / 0.1 / 0.2 s)');

log('Mixed 3 formant-preserved voices into synchronous and staggered stereo scenes.');`,
          tryThis: [
            'Change the harmony intervals from `-2` and `2` to `-5` and `7` (fourth below and fifth above) for an open resonant triad.',
            'Increase the stagger in `offsetMix` to `0.0`, `0.35`, `0.70` seconds for a clear cascading vocal echo.',
            'Duplicate lines in the `.mix` file at later timestamps (e.g. `3.5 s`) with reversed pan positions to build a six-entry vocal canon.',
          ],
        },
      ],
    },
    {
      id: 'm8-capstone',
      heading: 'End-to-End Sonic Capstone Chain',
      prose: [
        'Real CDP composition rarely stops at a single tool—its power emerges when you pipe time-domain generators into spectral sculptors and back into time-domain modifiers. Each domain exposes a different dimension of the sound.',
        'This capstone pipeline starts from a single 4-second metallic chime (`dingcdt.wav`), builds a dense stereo harmonic texture (`texture simple 3`), folds stereo to mono (`housekeep chans 4`) for phase-vocoder analysis (`pvoc anal 1`), smears attacks into a continuous pad (`blur blur 60`), distills only the 16 strongest spectral channels per window (`hilite trace 1`), resynthesises (`pvoc synth`), and drops the finished pad down by 18 semitones (`modify speed 2`) into a vast, slow-breathing cathedral drone.',
      ],
      tip: 'Compare the two outputs in Both view: the dry texture is full of distinct, bright metallic strikes; after blur → trace → varispeed down 18 semitones, those strikes melt into sparse, glowing low-register harmonic ribbons.',
      examples: [
        {
          id: 'm8-capstone-chain',
          title: 'Multi-Domain Composition Pipeline: Texture → Blur + Trace → Varispeed',
          summary: 'Chain 7 CDP processes—`texture`, `housekeep`, `pvoc`, `blur`, `hilite`, and `modify`—to transform a single saucepan-lid chime into an evolving deep spectral drone.',
          legacyOrigin: 'CDP Learning Manual — Multi-Stage Chain & Worksheet 5',
          programs: ['texture', 'housekeep', 'pvoc', 'blur', 'hilite', 'modify'],
          sourceAudio: 'dingcdt.wav',
          defaultViewMode: 'both',
          spectrogramColorMap: 'viridis',
          code: `const ding = await loadAudio('dingcdt.wav');

// Harmonic field for the initial chime cloud: open C7th voicing
const ndf = text([
  '60',
  '#4',
  '0 1 55 0 0',
  '0 1 60 0 0',
  '0 1 64 0 0',
  '0 1 70 0 0',
].join('\\n') + '\\n');

// 1. Generate a 10 s stereo harmonic texture from dingcdt.wav
const texRes = await cdp.run(
  'texture',
  [
    'simple', '3', '/in.wav', '/tex.wav', '/ndf.txt',
    '10', '0.2', '0.05', '0', '1', '1', '84', '104', '1.5', '1.5', '55', '70', '0',
    '-s1', '-w',
  ],
  { inputs: { '/in.wav': ding, '/ndf.txt': ndf }, outputs: ['/tex.wav'] }
);
const dryTex = texRes.outputs['/tex.wav'];
output(dryTex, '1. Dry stereo harmonic texture (texture simple 3)');

// 2. Mix stereo texture to mono (housekeep chans 4) for PVOC analysis
const mono = await cdp.process('housekeep', ['chans', '4', '$IN', '$OUT'], dryTex);

// 3. Analyse into the spectral domain
const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], mono.bytes, { outExt: 'ana' });

// 4. Blur across 60 spectral windows to melt attacks into a sustained wash
const blurred = await cdp.process(
  'blur',
  ['blur', '$IN', '$OUT', '60'],
  ana.bytes,
  { inExt: 'ana', outExt: 'ana' }
);

// 5. Retain only the 16 loudest channels per window (hilite trace 1)
const traced = await cdp.process(
  'hilite',
  ['trace', '1', '$IN', '$OUT', '16'],
  blurred.bytes,
  { inExt: 'ana', outExt: 'ana' }
);

// 6. Resynthesise to time domain
const synth = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], traced.bytes, { inExt: 'ana' });

// 7. Drop pitch by -18 semitones (lengthening ~2.8x into a cavernous slow drone)
const finalDrone = await cdp.process('modify', ['speed', '2', '$IN', '$OUT', '-18'], synth.bytes);
output(finalDrone.bytes, '2. Capstone drone (blur 60 -> trace 16 -> speed -18 st)');

log('Completed 7-stage multi-domain capstone chain.');`,
          tryThis: [
            'Drop `hilite trace` from `16` channels down to `6` for an ultra-sparse, glassy sine-like shimmer.',
            'Replace `dingcdt.wav` with `marimba.wav` or `cymcdt.wav` to hear how percussive vs noisy sources behave through the exact same pipeline.',
            'Insert `focus step $IN $OUT 0.25` right before `blur blur` to add subtle rhythmic step-frozen pulses inside the drone.',
          ],
        },
      ],
    },
  ],
};
