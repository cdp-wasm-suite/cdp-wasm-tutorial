import type { TutorialModule } from '../../types';

export const mod2Filters: TutorialModule = {
  id: 'mod2-filters',
  number: 2,
  title: 'Sculpting with Filters & Resonant Banks',
  subtitle: 'Carving spectral bands, sweeping resonant cutoffs, building harmonic comb banks, tuning broadband noise into chords, and phasing.',
  category: 'Time Domain',
  visualFocus: 'spectrum',
  overview: [
    'Filtering is the art of subtracting or emphasizing selected frequency regions directly in the time domain. Starting from an idling tractor (trcdt.wav)—a rich, broadband mechanical noise with prominent low resonances near 296 Hz and 796 Hz—you can carve away whole frequency bands or focus energy so tightly that pure musical pitches sing out of engine noise.',
    'This module progresses from basic low-pass, high-pass, band-pass, and notch filters (filter lohi and filter variable), through animated filter sweeps (filter sweeping), into CDP’s signature parallel filter banks (filter bank and filter userbank), and concludes with time-varying comb phasing and cumulative iterated filtering.',
  ],
  sources: ['trcdt.wav', 'capm.wav'],
  sections: [
    {
      id: 'm2-sec-lohi-variable',
      heading: 'Low-Pass, High-Pass, Band-Pass & Notch Filters',
      prose: [
        'CDP’s filter lohi Mode 1 implements both low-pass and high-pass filtering through the ordering of two frequencies: passband frequency and stopband frequency (preceded by attenuation in dB, such as -12). When the passband is lower than the stopband (296 Hz to 400 Hz), frequencies below 296 Hz pass untouched and roll off to silence by 400 Hz—a warm, muffled low-pass rumble. Reversing the order (1000 Hz down to 796 Hz) flips it into a high-pass filter that strips away the low engine throb.',
        'For surgical frequency isolation or removal, filter variable offers four modes on the command line: Mode 1 is notch (band-reject), Mode 2 is band-pass, Mode 3 is low-pass, and Mode 4 is high-pass. Its parameters are acuity (filter tightness—smaller values like 0.1 give narrower bands), gain, and center frequency in Hz. Band-passing at 796 Hz extracts a whistling, pitched tone from the tractor; notching at 296 Hz scoops a visible dark trench straight through its fundamental roar.',
      ],
      tip: 'Watch the spectrogram for each output: filter lohi slices cleanly across the horizontal frequency axis, while filter variable Mode 2 collapses the entire tractor spectrum down to a single glowing ribbon at 796 Hz.',
      examples: [
        {
          id: 'm2-lohi-variable',
          title: 'Low-Pass, High-Pass, Band-Pass & Notch on Tractor Noise',
          summary: 'Carves trcdt.wav four ways: low-pass below 296 Hz, high-pass above 1000 Hz, tight band-pass at 796 Hz, and a surgical notch at 296 Hz.',
          legacyOrigin: 'Workshop 1 — Worksheet 2 (ST1–ST4: FILTER LOHI & FILTER VARIABLE)',
          programs: ['filter'],
          sourceAudio: 'trcdt.wav',
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'inferno',
          code: `const src = await loadAudio('trcdt.wav');

// 1. Low-pass (pass < stop): pass below 296 Hz, cut above 400 Hz (-12 dB stopband)
const lowPass = await cdp.process(
  'filter',
  ['lohi', '1', '$IN', '$OUT', '-12', '296', '400'],
  src,
);

// 2. High-pass (pass > stop): pass above 1000 Hz, cut below 796 Hz
const highPass = await cdp.process(
  'filter',
  ['lohi', '1', '$IN', '$OUT', '-12', '1000', '796'],
  src,
);

// 3. Band-pass (Mode 2): acuity 0.1, gain 0.6, centered at 796 Hz
const bandPass = await cdp.process(
  'filter',
  ['variable', '2', '$IN', '$OUT', '0.1', '0.6', '796'],
  src,
);

// 4. Notch / band-reject (Mode 1): hollows out the 296 Hz engine peak
const notch = await cdp.process(
  'filter',
  ['variable', '1', '$IN', '$OUT', '0.1', '0.6', '296'],
  src,
);

output(lowPass.bytes, 'Low-Pass (< 296 Hz)');
output(highPass.bytes, 'High-Pass (> 1000 Hz)');
output(bandPass.bytes, 'Band-Pass (796 Hz)');
output(notch.bytes, 'Notch Reject (296 Hz)');`,
          tryThis: [
            'Push the high-pass filter up to 5000 / 4796 Hz to hear only the wispy metallic hiss at the top of the engine.',
            'Move the band-pass center frequency to 1796 Hz or 4796 Hz and tighten acuity from 0.1 to 0.02 for a ringing whistle.',
            'Swap trcdt.wav for count.wav and compare low-pass (0 500 1000) vs high-pass (0 3050 3000) on speech.',
          ],
        },
      ],
    },
    {
      id: 'm2-sec-sweeping',
      heading: 'Dynamic Sweeping Filters',
      prose: [
        'Static filters change color, while moving filters create gesture and motion. CDP’s filter sweeping oscillates the cutoff or center frequency sinusoidally between a low bound (lofrq) and a high bound (hifrq) at a specified sweep rate in Hz.',
        'Like filter variable, Mode 2 is band-pass and Mode 3 is low-pass. A very tight acuity (0.05) adds strong resonance right at the moving cutoff, producing classic wah-wah and synthesizer-like sweeps. Because trcdt.wav has energy across the full spectrum, a slow 0.1 Hz low-pass sweep paints a sweeping diagonal curtain across the spectrogram; applying the same sweep to speech (capm.wav) makes words alternately emerge into bright clarity and sink underwater.',
      ],
      examples: [
        {
          id: 'm2-filter-sweeping',
          title: 'Resonant Low-Pass & Band-Pass Filter Sweeps',
          summary: 'Sweeps a resonant low-pass cutoff (200–1000 Hz at 0.1 Hz) across both tractor noise and speech, plus a focused band-pass sweep across the tractor.',
          legacyOrigin: 'Workshop 1 — Worksheet 2 (ST14–ST16: FILTER SWEEPING)',
          programs: ['filter'],
          sourceAudio: 'trcdt.wav',
          extraSources: ['capm.wav'],
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'magma',
          code: `const tractor = await loadAudio('trcdt.wav');
const voice = await loadAudio('capm.wav');

// 1. Resonant low-pass sweep (Mode 3) on tractor: acuity 0.05, gain 0.5, 200 -> 1000 Hz at 0.1 Hz
const tractorLP = await cdp.process(
  'filter',
  ['sweeping', '3', '$IN', '$OUT', '0.05', '0.5', '200', '1000', '0.1'],
  tractor,
);

// 2. Band-pass sweep (Mode 2) on tractor: acuity 0.05, gain 0.6, 200 -> 1600 Hz at 0.4 Hz
const tractorBP = await cdp.process(
  'filter',
  ['sweeping', '2', '$IN', '$OUT', '0.05', '0.6', '200', '1600', '0.4'],
  tractor,
);

// 3. Same slow low-pass sweep applied to the spoken voice (gain 0.3 to prevent resonance clipping)
const voiceLP = await cdp.process(
  'filter',
  ['sweeping', '3', '$IN', '$OUT', '0.05', '0.3', '200', '1000', '0.1'],
  voice,
);

output(tractorLP.bytes, 'Tractor Low-Pass Sweep (200-1000 Hz)');
output(tractorBP.bytes, 'Tractor Band-Pass Sweep (200-1600 Hz)');
output(voiceLP.bytes, 'Voice Low-Pass Sweep (200-1000 Hz)');`,
          tryThis: [
            'Narrow the band-pass sweep to 200–220 Hz at 0.5 Hz (the exact classic workshop setting) to hear subtle beating around the engine fundamental.',
            'Speed up the voice sweep rate from 0.1 Hz to 1.5 Hz for a rhythmic auto-wah effect.',
            'Tighten acuity from 0.05 to 0.015 (and lower gain slightly) to hear the filter self-resonate into a singing sine trace.',
          ],
        },
      ],
    },
    {
      id: 'm2-sec-bank',
      heading: 'Harmonic & Equal-Interval Filter Banks',
      prose: [
        'One of CDP’s most musical timbral tools is filter bank: instead of a single filter, it runs dozens of sharply tuned parallel band-pass filters simultaneously across a frequency range (here 50 Hz to 10 kHz). With a high Q factor (50–150) and the -d double-filtering flag (which passes the signal through the bank twice for steeper skirts), broadband noise crystallizes into glowing pitched chords while retaining the natural rhythm and breath of the original source.',
        'Each mode arranges the filter frequencies according to a different acoustic series: Mode 1 follows the natural harmonic series above 50 Hz (rich, organ-like drone); Mode 4 adds a linear frequency offset (796 Hz) to every harmonic, twisting the chord into glassy, bell-like inharmonicity; and Mode 6 spaces filters by equal musical intervals in semitones—3 semitones stacks minor thirds into a shimmering diminished seventh chord across the entire spectrum.',
      ],
      tip: 'Look at the spectrogram: broadband tractor roar snaps into crisp horizontal comb lines—evenly spaced linearly in Modes 1 and 4, and logarithmically spaced across octaves in Mode 6.',
      examples: [
        {
          id: 'm2-filter-bank',
          title: 'Harmonic, Inharmonic-Offset & Minor-Third Filter Banks',
          summary: 'Transforms unpitched tractor noise into three contrasting pitched combs: harmonic series (Mode 1), +796 Hz inharmonic offset (Mode 4), and minor-third intervals (Mode 6).',
          legacyOrigin: 'Workshop 1 — Worksheet 2 (ST5, ST8, ST10: FILTER BANK Modes 1, 4, 6)',
          programs: ['filter'],
          sourceAudio: 'trcdt.wav',
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'inferno',
          code: `const src = await loadAudio('trcdt.wav');

// 1. Mode 1: Harmonic series over 50 Hz up to 10 kHz, Q=150, gain=5, double filtering (-d)
const harmonic = await cdp.process(
  'filter',
  ['bank', '1', '$IN', '$OUT', '150', '5', '50', '10000', '-d'],
  src,
);

// 2. Mode 4: Harmonic series shifted linearly by +796 Hz -> inharmonic metallic partials (Q=100)
const offset = await cdp.process(
  'filter',
  ['bank', '4', '$IN', '$OUT', '100', '5', '50', '10000', '796', '-d'],
  src,
);

// 3. Mode 6: Equal intervals of 3 semitones (minor thirds = diminished chord), Q=50
const minorThirds = await cdp.process(
  'filter',
  ['bank', '6', '$IN', '$OUT', '50', '5', '50', '10000', '3', '-d'],
  src,
);

output(harmonic.bytes, 'Mode 1: Harmonic Series (50 Hz)');
output(offset.bytes, 'Mode 4: Harmonic + 796 Hz Offset');
output(minorThirds.bytes, 'Mode 6: Minor Thirds (3 st)');`,
          tryThis: [
            'In Mode 6, replace the 3-semitone spacing with 7 (open perfect fifths), 6 (symmetrical tritones), or 12 (pure octaves).',
            'Change Mode 1 to Mode 2 (alternate odd harmonics only, like a clarinet) or Mode 3 (subharmonic series running downward).',
            'Lower Q from 150 to 15 to let more of the raw tractor grit bleed through the harmonic grid.',
          ],
        },
      ],
    },
    {
      id: 'm2-sec-userbank',
      heading: 'Tuning Noise to Custom Chords with filter userbank',
      prose: [
        'While filter bank generates algorithmic spacings, filter userbank lets you specify an exact custom voicing—either in Hz (Mode 1) or as MIDI note numbers (Mode 2), each paired with a relative amplitude in dB (such as 60 0dB for middle C). This turns any noisy or granular source into a bespoke harmonic instrument.',
        'Even better, the Q parameter accepts a breakpoint file. Starting at a loose Q of 15 lets the raw broadband texture dominate; ramping Q up to 100 at 2.6 seconds pulls the exact nine-note chord into luminous focus before relaxing back toward Q 50. Notice how swapping just two MIDI notes—E (64, 76) down to E-flat (63, 75)—shifts the entire acoustic mood from bright C major to brooding C minor.',
      ],
      examples: [
        {
          id: 'm2-filter-userbank',
          title: 'Custom C-Major vs C-Minor Chord Banks with Evolving Q',
          summary: 'Tunes broadband tractor noise onto nine-note C-major and C-minor MIDI voicings while a breakpoint curve sweeps filter Q from 15 up to 100 and back to 50.',
          legacyOrigin: 'Workshop 1 — Worksheet 4 (ST6: FILTER USERBANK Mode 2)',
          programs: ['filter'],
          sourceAudio: 'trcdt.wav',
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'viridis',
          code: `const src = await loadAudio('trcdt.wav');

// Nine-note C-major chord in MIDI note numbers + relative gains
const cMajor = text([
  '36  0dB',
  '43  0dB',
  '48  0dB',
  '55  0dB',
  '64  0dB',
  '67  0dB',
  '72  0dB',
  '76  0dB',
  '79  0dB',
].join('\\n'));

// Same voicing with E (64, 76) lowered to Eb (63, 75) -> C minor
const cMinor = text([
  '36  0dB',
  '43  0dB',
  '48  0dB',
  '55  0dB',
  '63  0dB',
  '67  0dB',
  '72  0dB',
  '75  0dB',
  '79  0dB',
].join('\\n'));

// Time-varying Q: rough (15) -> sharply pitched chord (100) -> softer bloom (50)
const qCurve = text([
  '0.0   15',
  '2.6  100',
  '5.2   50',
].join('\\n'));

// Mode 2 = MIDI pitches, gain = 12, double filtering (-d)
const majorOut = await cdp.process(
  'filter',
  ['userbank', '2', '$IN', '$OUT', '/cmaj.txt', '/q.brk', '12', '-d'],
  src,
  { extraInputs: { '/cmaj.txt': cMajor, '/q.brk': qCurve } },
);

const minorOut = await cdp.process(
  'filter',
  ['userbank', '2', '$IN', '$OUT', '/cmin.txt', '/q.brk', '12', '-d'],
  src,
  { extraInputs: { '/cmin.txt': cMinor, '/q.brk': qCurve } },
);

output(majorOut.bytes, 'C-Major Chord Bank (varying Q)');
output(minorOut.bytes, 'C-Minor Chord Bank (varying Q)');`,
          tryThis: [
            'Edit the MIDI notes in cMajor to spell a lush Cmaj9 chord (replace 72 with 71 and add 74 0dB).',
            'Swap trcdt.wav for cymcdt.wav (suspended cymbal) and raise gain from 12 to 40 for a shimmering chordal wash.',
            'Invert the Q curve ("0.0 150", "5.0 10") so a crystalline chord dissolves gradually back into raw engine noise.',
          ],
        },
      ],
    },
    {
      id: 'm2-sec-phasing-iterated',
      heading: 'Phasing & Cumulative Iterated Filtering',
      prose: [
        'Delay and filtering merge in two strikingly different voice treatments. First, filter phasing Mode 2 sums a sound with a phase-shifted delayed copy of itself. When the delay time sweeps smoothly downward via a breakpoint file—from 300 ms down to 20 ms—an initial slapback echo tightens into a sweeping hollow comb filter, making the speaker appear to walk from a distant stone hall right up to your ear.',
        'Second, filter iterated Mode 1 repeats a short audio phrase over a target duration (here 14 seconds) while feeding each successive repetition back through a resonant filter bank again. On the first pass the words are clear; by the tenth cumulative pass, every non-resonant frequency has been filtered away and the speech dissolves into glowing, ringing harmonic chimes. Adding -p3 introduces up to 3 semitones of random pitch drift per iteration.',
      ],
      examples: [
        {
          id: 'm2-phasing-iterated',
          title: 'Time-Varying Phasing & Cumulative Iterated Filtering',
          summary: 'Sweeps a phasing delay from 300 ms down to 20 ms across capm.wav, then cuts its closing phrase ("she’s goin’ to blow, captain") and iteratively filters it into ringing pitched echoes.',
          legacyOrigin: 'Workshop 1 — Worksheet 2 (ST11–ST13: FILTER PHASING & FILTER ITERATED)',
          programs: ['filter', 'sfedit'],
          sourceAudio: 'capm.wav',
          defaultViewMode: 'both',
          spectrogramColorMap: 'inferno',
          code: `const src = await loadAudio('capm.wav');

// 1. Time-varying phasing delay (milliseconds): 300 ms -> 20 ms
const delayCurve = text([
  '0.0  300',
  '1.5  200',
  '3.0   80',
  '4.5   80',
  '6.0   40',
  '7.0   20',
].join('\\n'));

const phased = await cdp.process(
  'filter',
  ['phasing', '2', '$IN', '$OUT', '0.25', '/phasdlay.brk'],
  src,
  { extraInputs: { '/phasdlay.brk': delayCurve } },
);

// 2. Cut seconds 5.8 to 7.2 ("she's goin' to blow, captain")
const phrase = await cdp.process('sfedit', ['cut', '1', '$IN', '$OUT', '5.8', '7.2'], src);

// Equal-interval 3-semitone frequency bank (Hz + dB) for cumulative iterated filtering
const eqBank = text([
  '113.137  0dB',
  '134.543  0dB',
  '160.000  0dB',
  '190.273  0dB',
  '226.274  0dB',
  '269.087  0dB',
  '320.000  0dB',
  '380.546  0dB',
  '452.548  0dB',
  '538.174  0dB',
  '640.000  0dB',
  '761.093  0dB',
  '905.097  0dB',
  '1076.347 0dB',
  '1280.000 0dB',
  '1522.185 0dB',
  '1810.193 0dB',
  '2152.695 0dB',
  '2560.000 0dB',
  '3044.370 0dB',
].join('\\n'));

// Mode 1 (Hz bank): Q=50, gain=5, delay=0.25 s, output duration=14 s, random pitch shift up to 3 st
const iterated = await cdp.process(
  'filter',
  ['iterated', '1', '$IN', '$OUT', '/eqbank.txt', '50', '5', '0.25', '14', '-p3'],
  phrase.bytes,
  { extraInputs: { '/eqbank.txt': eqBank } },
);

output(phased.bytes, 'Phasing (300 ms -> 20 ms sweep)');
output(iterated.bytes, 'Iterated Cumulative Filter Bank (-p3)');`,
          tryThis: [
            'Replace /phasdlay.brk with a fixed value of 35 (ms) to hear a tight, boxy enclosed-room comb resonance.',
            'Remove the -p3 flag from filter iterated to hear the pure un-shifted cumulative filter resonances ring out steadily.',
            'Shorten the iterated delay from 0.25 to 0.12 s for a dense, cascading metallic swarm.',
          ],
        },
      ],
    },
  ],
};
