import type { TutorialModule } from '../../types';

export const mod5Transposition: TutorialModule = {
  id: 'mod5-transposition',
  number: 5,
  title: 'Spectral Transposition, Formants & Shifting',
  subtitle: 'Decoupling pitch from duration, preserving vocal tract resonances, tuning spectra to chords, and breaking harmonicity',
  category: 'Spectral (PVOC)',
  visualFocus: 'spectrum',
  overview: [
    'Transposing a sound in the time domain with varispeed changes both pitch and duration together—and shifts the fixed resonances (formants) that give voices and instruments their identity. Moving into the phase-vocoder spectral domain (`pvoc anal` → spectral process → `pvoc synth`) breaks those couplings apart.',
    'In this module you will compare varispeed against spectral transposition with and without formant preservation, drive pitch contours from time-varying breakpoint curves, split a spectrum at a crossover frequency to transpose only its upper partials, snap an entire voice onto a harmonic triad, and deliberately destroy harmonicity with additive frequency shifting and spectral vibrato.',
  ],
  sources: ['vocalsnd.wav', 'count.wav', 'drumsnd.wav'],
  sections: [
    {
      id: 'm5-formants',
      heading: 'Pitch Without Time Change — and With Formants Intact',
      prose: [
        'Every pitched acoustic sound has two intertwined structures: the spacing of its harmonic partials (which determines perceived pitch) and its broad spectral envelope of resonant peaks—the formants—shaped by the vocal tract or instrument body. When you raise a voice by an octave with time-domain varispeed (`modify speed 2`), the recording plays at double speed and every formant doubles in frequency, creating a bright, cartoonish timbre.',
        'Spectral transposition with `repitch transpose 3` scales all partial frequencies inside each analysis window without changing the playback rate, keeping duration fixed while still shifting the formants upward. Adding formant extraction with `repitch transposef 3` (`-f12` models the spectral envelope using 12 analysis channels per band) separates the spectral envelope from the harmonics, transposes the partials, and then re-imposes the original formants so the singer still sounds recognisably human at the new pitch.',
      ],
      tip: 'Switch the player view to Both or Spectrum and compare the three outputs: `modify speed 2` is half as long; `repitch transpose 3` keeps the full 4.9 s duration with upward-shifted resonances; `repitch transposef 3` raises the harmonic lines while keeping the bright formant bands anchored at their original frequencies.',
      examples: [
        {
          id: 'm5-formant-compare',
          title: 'Three Routes to +12 Semitones: Varispeed vs Spectral vs Formant-Preserving',
          summary: 'A/B compare time-domain varispeed, raw spectral transposition, and formant-preserving spectral transposition on a sung phrase raised by one octave.',
          legacyOrigin: 'Workshop 3 — Lesson 2 & Lesson 3',
          programs: ['modify', 'pvoc', 'repitch'],
          sourceAudio: 'vocalsnd.wav',
          defaultViewMode: 'both',
          spectrogramColorMap: 'inferno',
          code: `const wav = await loadAudio('vocalsnd.wav');

// 1. Time-domain varispeed: +12 semitones halves duration and doubles formants
const speedUp = await cdp.process('modify', ['speed', '2', '$IN', '$OUT', '12'], wav);
output(speedUp.bytes, '1. modify speed (+12 st, half length)');

// Analyse into the spectral domain once for both spectral comparisons
const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], wav, { outExt: 'ana' });

// 2. Spectral transposition (Mode 3 = semitones): preserves duration, shifts formants
const rawTrans = await cdp.process(
  'repitch',
  ['transpose', '3', '$IN', '$OUT', '12'],
  ana.bytes,
  { inExt: 'ana', outExt: 'ana' }
);
const rawWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], rawTrans.bytes, { inExt: 'ana' });
output(rawWav.bytes, '2. repitch transpose (+12 st, formants shifted)');

// 3. Formant-preserving transposition (-f12 = 12 channels per formant band)
const fmtTrans = await cdp.process(
  'repitch',
  ['transposef', '3', '$IN', '$OUT', '-f12', '12'],
  ana.bytes,
  { inExt: 'ana', outExt: 'ana' }
);
const fmtWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], fmtTrans.bytes, { inExt: 'ana' });
output(fmtWav.bytes, '3. repitch transposef (-f12, formants kept)');

log('Rendered 3 transpositions (+12 semitones) for direct A/B comparison.');`,
          tryThis: [
            'Change the transposition from `12` to `-12` (down an octave) or `19` (up an octave and a fifth) to hear where formant preservation works best.',
            'Replace `-f12` (linear frequency-band formant extraction) with `-p12` (12 pitchwise bands per octave) and compare the vowel clarity.',
            'Try `-f4` vs `-f24` on `repitch transposef` to hear how finer vs coarser spectral envelope tracking colours the voice.',
          ],
        },
        {
          id: 'm5-tv-transpose',
          title: 'Time-Varying Spectral Pitch Glides',
          summary: 'Sweep the sung voice from 0 to +12, plunge to -24, and climb back to +12 semitones using an inline breakpoint curve—without altering timing.',
          legacyOrigin: 'Workshop 3 — Lesson 2',
          programs: ['pvoc', 'repitch'],
          sourceAudio: 'vocalsnd.wav',
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'inferno',
          code: `const wav = await loadAudio('vocalsnd.wav');

// Breakpoint curve: time (seconds) -> transposition (semitones)
const curve = text([
  '0.0   0',
  '1.0  12',
  '3.0 -24',
  '4.5  12',
].join('\\n') + '\\n');

const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], wav, { outExt: 'ana' });

// Raw spectral sweep (formants sweep alongside harmonics)
const rawRes = await cdp.run(
  'repitch',
  ['transpose', '3', '/in.ana', '/out.ana', '/curve.brk'],
  { inputs: { '/in.ana': ana.bytes, '/curve.brk': curve }, outputs: ['/out.ana'] }
);
const rawWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], rawRes.outputs['/out.ana'], { inExt: 'ana' });
output(rawWav.bytes, 'repitch transpose (sweeping formants)');

// Formant-preserving spectral sweep (-f12 keeps vowel character steady)
const fmtRes = await cdp.run(
  'repitch',
  ['transposef', '3', '/in.ana', '/out.ana', '-f12', '/curve.brk'],
  { inputs: { '/in.ana': ana.bytes, '/curve.brk': curve }, outputs: ['/out.ana'] }
);
const fmtWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], fmtRes.outputs['/out.ana'], { inExt: 'ana' });
output(fmtWav.bytes, 'repitch transposef -f12 (anchored formants)');

log('Applied 4-point semitone glide across the 4.93 s vocal phrase.');`,
          tryThis: [
            'Turn the gradual glide into an abrupt stepped jump by putting two points 0.02 s apart, e.g. `1.98 12` followed by `2.00 -12`.',
            'Narrow the range to subtle microtonal bends (`-1.5` to `+1.5` semitones) for eerie pitch drift.',
            'Swap `vocalsnd.wav` for `hornsnd.wav` or `bellsnd.wav` to hear how sustained brass and metallic partials bend smoothly.',
          ],
        },
      ],
    },
    {
      id: 'm5-split-and-tune',
      heading: 'Split-Spectrum Transposition & Chord Tuning',
      prose: [
        'Because a phase-vocoder analysis file stores every frequency bin independently, you do not have to transpose the entire spectrum by the same interval. `pitch transp` divides the spectrum around a crossover frequency: Mode 4 transposes only partials above the split point while leaving the fundamentals below completely untouched, creating impossible hybrid timbres where bass resonance and upper overtones diverge.',
        '`pitch tune 2` takes spectral pitch manipulation even further by pulling every partial in the analysis file toward the nearest pitch class in a user-defined tuning template (`.tun` file of MIDI note numbers). Applied to speech, an ordinary speaking voice suddenly resonates with an internal chord while retaining its consonant articulation and speech rhythm.',
      ],
      tip: 'In the spectrogram of `pitch transp 4`, look right along the 1000 Hz horizontal line: everything below remains identical to the original voice, while the upper harmonics leap upward by a full octave.',
      examples: [
        {
          id: 'm5-split-transp',
          title: 'Split-Spectrum Transposition Above & Below 1000 Hz',
          summary: 'Use `pitch transp` Mode 4 and Mode 5 to transpose only one side of a 1000 Hz spectral crossover, splitting fundamentals from upper harmonics.',
          legacyOrigin: 'Workshop 3 — Lesson 4',
          programs: ['pvoc', 'pitch'],
          sourceAudio: 'vocalsnd.wav',
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'magma',
          code: `const wav = await loadAudio('vocalsnd.wav');
const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], wav, { outExt: 'ana' });

// Mode 4: transpose partials ABOVE 1000 Hz up by +12 semitones; keep < 1000 Hz intact
const hiUp = await cdp.process(
  'pitch',
  ['transp', '4', '$IN', '$OUT', '1000', '12'],
  ana.bytes,
  { inExt: 'ana', outExt: 'ana' }
);
const hiWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], hiUp.bytes, { inExt: 'ana' });
output(hiWav.bytes, 'Mode 4: above 1000 Hz shifted +12 st');

// Mode 5: transpose partials BELOW 1000 Hz down by -7 semitones; keep > 1000 Hz intact
const loDown = await cdp.process(
  'pitch',
  ['transp', '5', '$IN', '$OUT', '1000', '-7'],
  ana.bytes,
  { inExt: 'ana', outExt: 'ana' }
);
const loWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], loDown.bytes, { inExt: 'ana' });
output(loWav.bytes, 'Mode 5: below 1000 Hz shifted -7 st');

log('Split-spectrum transposition complete around 1000 Hz.');`,
          tryThis: [
            'Lower the split frequency from `1000` to `350` Hz so almost all harmonic overtones shift while only the fundamental stays rooted.',
            'Try Mode 6 (`pitch transp 6 $IN $OUT 1000 12 -7`) to transpose above and below the split point in opposite directions simultaneously.',
            'Try an extreme interval like `20` semitones above 1000 Hz to hear glassy, whistling overtones detach from the voice.',
          ],
        },
        {
          id: 'm5-spectral-tune',
          title: 'Spectral Chord Tuning (`pitch tune 2`)',
          summary: 'Pull the spectral partials of a speaking voice onto an A-minor triad (MIDI 57, 60, 64), turning ordinary counting speech into a harmonised chorus.',
          legacyOrigin: 'Workshop 1 — Worksheet 9 (ST15)',
          programs: ['pvoc', 'pitch'],
          sourceAudio: 'count.wav',
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'viridis',
          code: `const wav = await loadAudio('count.wav');

// Tuning template in MIDI pitches: A3 (57), C4 (60), E4 (64)
// Mode 2 maps partials across all octaves onto these pitch classes.
const aMinor = text('57 60 64\\n');

const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], wav, { outExt: 'ana' });

// -f1 = maximum focus (pull partials tightly onto chord tones)
// -c1 = maximum clarity (emphasise tuned spectral peaks)
const tuned = await cdp.run(
  'pitch',
  ['tune', '2', '/in.ana', '/out.ana', '/amin.tun', '-f1', '-c1'],
  { inputs: { '/in.ana': ana.bytes, '/amin.tun': aMinor }, outputs: ['/out.ana'] }
);

const out = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], tuned.outputs['/out.ana'], { inExt: 'ana' });
log('Tuned count.wav partials to A minor (MIDI 57 60 64).');
return out.bytes;`,
          tryThis: [
            'Change `57 60 64` to a spread diminished chord (`60 66 75 81`) or a suspended quartal voicing (`55 60 65 70`).',
            'Reduce `-f1` to `-f0.4` to hear partial tuning that leaves more natural spoken inflection intact.',
            'Chain a `blur blur` (`70` windows) right after `pitch tune` and before `pvoc synth` to turn the tuned speech into a glassy synthetic choir.',
          ],
        },
      ],
    },
    {
      id: 'm5-inharmonic',
      heading: 'Additive Frequency Shifting & Spectral Vibrato',
      prose: [
        'True musical transposition is multiplicative: multiplying every partial by 2 raises a 100 Hz fundamental and its 200 Hz, 300 Hz, 400 Hz harmonics to 200, 400, 600, 800 Hz, preserving the 1:2:3:4 harmonic ratio. `strange shift` is additive: adding a fixed frequency offset (say +350 Hz) moves those partials to 450, 550, 650, 750 Hz—ratios that are no longer integer multiples, immediately transforming pitched or percussive sounds into metallic, bell-like, or alien textures.',
        '`strange waver` creates a distinctive spectral vibrato by oscillating the spectrum at a given rate between its natural harmonic spacing and a stretched inharmonic state above a chosen threshold frequency. At slow rates (5 Hz) the voice sounds hollow and watery; at fast rates (25 Hz, 10× stretch) it turns sharply robotic.',
      ],
      tip: 'Watch the spectrogram of `strange shift 1`: instead of fanning outward proportionally like transposition, every spectral ridge rises upward along a parallel diagonal ramp from +10 Hz to +3000 Hz.',
      examples: [
        {
          id: 'm5-strange-shift-waver',
          title: 'Inharmonic Frequency Shift & Spectral Waver',
          summary: 'Sweep a drum riff upward by +10 to +3000 Hz with additive `strange shift 1`, then apply robotic 25 Hz spectral vibrato to speech with `strange waver 1`.',
          legacyOrigin: 'Workshop 3 — Lesson 4 & Worksheet 9 (ST45)',
          programs: ['pvoc', 'strange'],
          sourceAudio: 'drumsnd.wav',
          extraSources: ['count.wav'],
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'magma',
          code: `// Part 1: Additive linear frequency shift on drumsnd.wav
const drums = await loadAudio('drumsnd.wav');
const shiftCurve = text([
  '0.0    10',
  '4.5  3000',
].join('\\n') + '\\n');

const drumAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], drums, { outExt: 'ana' });
const shifted = await cdp.run(
  'strange',
  ['shift', '1', '/in.ana', '/out.ana', '/frqshift.brk'],
  { inputs: { '/in.ana': drumAna.bytes, '/frqshift.brk': shiftCurve }, outputs: ['/out.ana'] }
);
const drumOut = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], shifted.outputs['/out.ana'], { inExt: 'ana' });
output(drumOut.bytes, '1. strange shift 1 (drums +10 to +3000 Hz)');

// Part 2: Spectral vibrato (waver) on count.wav
// Args: mode=1, vibfreq=25 Hz, stretch=10, basefreq=50 Hz
const count = await loadAudio('count.wav');
const countAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], count, { outExt: 'ana' });
const wavered = await cdp.process(
  'strange',
  ['waver', '1', '$IN', '$OUT', '25', '10', '50'],
  countAna.bytes,
  { inExt: 'ana', outExt: 'ana' }
);
const countOut = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], wavered.bytes, { inExt: 'ana' });
output(countOut.bytes, '2. strange waver 1 (speech, 25 Hz, 10x stretch)');

log('Rendered additive frequency shift and robotic spectral waver.');`,
          tryThis: [
            'Make `shiftCurve` go negative (`0.0 0`, `2.5 -400`, `4.5 0`) to fold low drum energy down through zero into hollow metallic thuds.',
            'Slow `strange waver` from `25 10 50` down to `5 5 50` for a gentler, hollow shimmer.',
            'Raise `strange waver` base frequency from `50` to `800` Hz so speech fundamentals stay natural while upper sibilants shimmer.',
          ],
        },
      ],
    },
  ],
};
