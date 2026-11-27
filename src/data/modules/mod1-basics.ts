import type { TutorialModule } from '../../types';

export const mod1Basics: TutorialModule = {
  id: 'mod1-basics',
  number: 1,
  title: 'Time-Domain Foundations',
  subtitle: 'Inspecting, slicing, shaping, transposing, reversing, modulating, and echoing soundfiles directly in the time domain.',
  category: 'Time Domain',
  visualFocus: 'waveform',
  overview: [
    'Every Composers Desktop Project (CDP) workflow begins with understanding the raw audio signal in the time domain: its exact duration, its peak sample amplitude, and how its loudness envelope unfolds from sample to sample.',
    'In this module you will inspect soundfiles with sndinfo, extract clean musical phrases with sfedit cut and envel dovetail, explore tape-style varispeed pitch transposition and breakpoint-driven glides with modify speed, invert time and create metallic sidebands with modify radical, build resonant spaces with modify revecho and reverb, and modulate playback speed into musical or alien tape vibrato.',
  ],
  sources: ['count.wav', 'capm.wav'],
  sections: [
    {
      id: 'm1-sec-inspect-cut',
      heading: 'Inspecting, Slicing & Shaping Soundfiles',
      prose: [
        'Before transforming a soundfile, inspect its duration and peak level. In CDP, sndinfo len reports the exact length in seconds, while sndinfo maxsamp reports the highest sample amplitude and its timestamp. Checking peak amplitude before applying gain or filtering protects against clipping—when samples hit 1.0, peaks flatten off and introduce harsh distortion.',
        'Raw edits made with sfedit cut 1 slice out a time window [start, end] in seconds. Because a sudden cut rarely lands on a zero crossing, abrupt edges produce audible clicks. Passing the excerpt through envel dovetail applies fade-in and fade-out ramps: Mode 1 creates straight linear fades (with two trailing shape flags, 0 0), while Mode 2 creates curved exponential fades that sound smoother and more natural to human ears.',
      ],
      tip: 'Compare the linear and exponential outputs in the waveform display: the linear fade forms straight triangular wedges at both ends, whereas the exponential fade bows inward for a gentler onset and release.',
      examples: [
        {
          id: 'm1-inspect-cut-dovetail',
          title: 'Inspect, Cut & Compare Linear vs Exponential Dovetails',
          summary: 'Logs duration and peak level of count.wav, cuts the opening 4.2 seconds ("one, two, three, four, five"), and compares linear (Mode 1) against exponential (Mode 2) fade ramps.',
          legacyOrigin: 'A Learning Manual — Topic 1 (MAXSAMP, LEN, CUT, DOVETAIL)',
          programs: ['sndinfo', 'sfedit', 'envel'],
          sourceAudio: 'count.wav',
          defaultViewMode: 'waveform',
          code: `const src = await loadAudio('count.wav');

// 1. Inspect duration and peak sample amplitude (console-only programs use cdp.run)
const lenInfo = await cdp.run('sndinfo', ['len', '/in.wav'], {
  inputs: { '/in.wav': src },
});
const maxInfo = await cdp.run('sndinfo', ['maxsamp', '/in.wav'], {
  inputs: { '/in.wav': src },
});
log('Duration:', lenInfo.stdout.trim());
log('Peak level:', maxInfo.stdout.trim());

// 2. Cut seconds 0.0 to 4.2 ("one, two, three, four, five")
const cut = await cdp.process('sfedit', ['cut', '1', '$IN', '$OUT', '0.0', '4.2'], src);

// 3. Apply a 1.0 s fade-in and 1.2 s fade-out: Mode 1 (linear) vs Mode 2 (exponential)
const linear = await cdp.process(
  'envel',
  ['dovetail', '1', '$IN', '$OUT', '1.0', '1.2', '0', '0'],
  cut.bytes,
);
const expo = await cdp.process(
  'envel',
  ['dovetail', '2', '$IN', '$OUT', '1.0', '1.2'],
  cut.bytes,
);

output(linear.bytes, 'Cut + Linear Dovetail (1.0 s / 1.2 s)');
output(expo.bytes, 'Cut + Exponential Dovetail (1.0 s / 1.2 s)');`,
          tryThis: [
            'Change the cut window from 0.0–4.2 to 4.2–8.0 to isolate the second half of the count ("six" through "ten").',
            'Shorten the fades to 0.02 and 0.05 seconds for transparent click-free splicing that preserves the full attack.',
            'Try fade lengths whose sum exceeds 4.2 seconds (for example 2.5 and 2.5) to see CDP report an overlap error.',
          ],
        },
      ],
    },
    {
      id: 'm1-sec-varispeed',
      heading: 'Varispeed Pitch & Time-Varying Glides',
      prose: [
        'In the time domain, pitch and speed are physically locked together—just like speeding up or slowing down an analog tape machine. CDP’s modify speed Mode 2 resamples the waveform by a shift measured in semitones. Raising a voice by +12 semitones doubles every frequency and halves the duration; lowering by -12 semitones halves every frequency and doubles the duration, thickening the vocal tract resonances into a slow, booming bass.',
        'Almost every time-domain parameter in CDP also accepts a breakpoint file: a plain-text list of "time  value" pairs that linearly interpolates between timestamps. Placing two timestamps 0.1 seconds apart creates a sudden pitch step, whereas spacing them several seconds apart creates a continuous glissando.',
      ],
      tip: 'Watch the spectrogram on the breakpoint glide: harmonic ridges stay flat during held plateaus (0–1.4 s, 1.5–2.9 s, 3.0–4.5 s), snap vertically across the 0.1 s jumps, and sweep upward into a bright curve over the final 2.7 seconds.',
      examples: [
        {
          id: 'm1-speed-fixed-glide',
          title: 'Fixed Octave Shift & Stepped/Curving Breakpoint Glide',
          summary: 'Compares a fixed -12 semitone varispeed transposition (doubling duration) against a stepped-and-gliding breakpoint contour on a spoken male voice.',
          legacyOrigin: 'Workshop 1 — Worksheet 1 (ST1–ST5: MODIFY SPEED & TRCHNG.BRK)',
          programs: ['modify'],
          sourceAudio: 'capm.wav',
          defaultViewMode: 'both',
          spectrogramColorMap: 'inferno',
          code: `const src = await loadAudio('capm.wav');

// 1. Fixed varispeed: down one octave (-12 semitones) doubles length from 7.2 s to 14.4 s
const downOctave = await cdp.process('modify', ['speed', '2', '$IN', '$OUT', '-12'], src);

// 2. Breakpoint contour (time in seconds -> transposition in semitones)
//    Holds at 0 st, jumps to +7 st, steps to +4 st, then glides smoothly up to +12 st
const contour = text([
  '0.0   0',
  '1.4   0',
  '1.5   7',
  '2.9   7',
  '3.0   4',
  '4.5   4',
  '7.2  12',
].join('\\n'));

const glide = await cdp.process(
  'modify',
  ['speed', '2', '$IN', '$OUT', '/trchng.brk'],
  src,
  { extraInputs: { '/trchng.brk': contour } },
);

output(downOctave.bytes, 'Fixed -12 semitones (2x slower)');
output(glide.bytes, 'Stepped + curving glide (0 -> +7 -> +4 -> +12 st)');`,
          tryThis: [
            'Change -12 to +12 on the first command to hear the voice jump an octave higher and finish in half the time (3.6 s).',
            'Replace the breakpoint table with a smooth downward plunge: "0.0 0" to "7.2 -12".',
            'Exaggerate the final target from +12 to +24 semitones to hear the closing syllable accelerate into a bright chirp.',
          ],
        },
      ],
    },
    {
      id: 'm1-sec-radical',
      heading: 'Time Reversal & Ring Modulation',
      prose: [
        'The modify radical suite provides sample-level structural transformations that radically alter timbre and temporal identity without spectral analysis. Mode 1 reverses the soundfile from last sample to first. Because natural speech consists of sharp consonantal attacks followed by decaying vowel tails, reversing time turns every syllable inside out: vowels swell eerily from silence and terminate in crisp backward snaps.',
        'Mode 5 performs ring modulation, multiplying every sample of the input by a pure sine wave at a chosen frequency fc. Acoustically, every input frequency f splits into two sidebands at (f + fc) and |f - fc|, while the original frequencies disappear. At low carrier rates (3–15 Hz), the sidebands beat gently against one another, creating a rhythmic tremolo or flutter. At audio rates (200–1000 Hz), the shifted sidebands break harmonic ratios apart, yielding hollow, robotic, metallic timbres.',
      ],
      tip: 'Notice in the waveform and spectrogram how ring modulation preserves the exact 8.07 s duration while splitting every vocal harmonic into upper and lower sidebands around the carrier frequency.',
      examples: [
        {
          id: 'm1-radical-reverse-ringmod',
          title: 'Backward Speech & Ring Modulation (Flutter vs Hollow Metallic)',
          summary: 'Reverses count.wav sample-by-sample, then contrasts 10 Hz ring modulation (rapid flutter) against 500 Hz ring modulation (hollow inharmonic sidebands).',
          legacyOrigin: 'Workshop 1 — Worksheet 9 (ST37–ST39, ST49: MODIFY RADICAL Modes 1 & 5)',
          programs: ['modify'],
          sourceAudio: 'count.wav',
          defaultViewMode: 'both',
          spectrogramColorMap: 'magma',
          code: `const src = await loadAudio('count.wav');

// 1. Reverse playback (Mode 1): last sample to first
const reversed = await cdp.process('modify', ['radical', '1', '$IN', '$OUT'], src);

// 2. Low-frequency ring modulation at 10 Hz (Mode 5): beating sidebands create vocal flutter
const rm10 = await cdp.process('modify', ['radical', '5', '$IN', '$OUT', '10'], src);

// 3. Audio-rate ring modulation at 500 Hz: wide sum/difference sidebands turn speech hollow
const rm500 = await cdp.process('modify', ['radical', '5', '$IN', '$OUT', '500'], src);

output(reversed.bytes, 'Reversed speech (modify radical 1)');
output(rm10.bytes, 'Ring mod 10 Hz (vocal flutter)');
output(rm500.bytes, 'Ring mod 500 Hz (hollow metallic)');`,
          tryThis: [
            'Lower the 10 Hz ring-mod carrier to 3 Hz for a slow, trembling vocal wobble.',
            'Push the 500 Hz carrier up to 1200 Hz or 2400 Hz and observe the mirrored spectral bands separating in the spectrogram.',
            'Chain reversed.bytes directly into ring modulation at 400 Hz for an instant sci-fi transmission texture.',
          ],
        },
      ],
    },
    {
      id: 'm1-sec-space',
      heading: 'Stadium Echoes & Algorithmic Reverberation',
      prose: [
        'Spatial depth in the time domain arises from delayed reflections. CDP offers two distinct approaches: modify revecho Mode 3 (stadium echo) generates a train of discrete, slightly filtered echoes simulating sound bouncing across a huge open arena. Its flags control reflection gain (-g), high-frequency roll-off (-r), echo spacing scale (-s, where 1 = 0.1 s and 2 = 0.2 s), and number of echoes (-e).',
        'By contrast, the standalone reverb program builds a dense, diffuse multi-channel reverberation tail using parallel comb and allpass delay networks. Its six positional parameters are room gain (0.25), wet/dry mix (0.7), reverb decay time in seconds, high-frequency absorption (0–1), low-pass cutoff (Hz), and extra tail duration (seconds). In the waveform display, stadium echo appears as distinct repeating spikes, whereas reverb fills the silences between words with a smooth, tapering wash.',
      ],
      examples: [
        {
          id: 'm1-revecho-reverb',
          title: 'Stadium Echo vs Multi-Channel Room Reverb',
          summary: 'Compares discrete stadium reflections (0.2 s spacing, 15 echoes) against a smooth 2.5-second algorithmic room reverb on spoken numbers.',
          legacyOrigin: 'Workshop 1 — Worksheet 9 (ST8–ST12: REVERB & MODIFY REVECHO)',
          programs: ['modify', 'reverb'],
          sourceAudio: 'count.wav',
          defaultViewMode: 'waveform',
          code: `const src = await loadAudio('count.wav');

// 1. Stadium echo (Mode 3): gain 0.65, roll-off 1, spacing scale 2 (0.2 s), 15 echoes
const stadium = await cdp.process(
  'modify',
  ['revecho', '3', '$IN', '$OUT', '-g0.65', '-r1', '-s2', '-e15'],
  src,
);

// 2. Algorithmic reverb: rgain=0.25, mix=0.7, decay=2.5 s, absorption=0.5, lpf=5000 Hz, tail=5 s
const room = await cdp.process(
  'reverb',
  ['$IN', '$OUT', '0.25', '0.7', '2.5', '0.5', '5000', '5'],
  src,
);

output(stadium.bytes, 'Stadium Echo (-s2, 15 echoes)');
output(room.bytes, 'Algorithmic Reverb (2.5 s decay)');`,
          tryThis: [
            'Reduce stadium spacing from -s2 to -s1 and raise -e15 to -e25 for a tighter, longer metallic cavern slapback.',
            'Change the reverb decay time from 2.5 to 1.0 (small room) or 6.0 (cathedral), adjusting the final tail parameter to match.',
            'Lower the reverb low-pass cutoff from 5000 to 1200 Hz for a dark, muffled acoustic chamber.',
          ],
        },
      ],
    },
    {
      id: 'm1-sec-vibrato',
      heading: 'Tape Vibrato',
      prose: [
        'What happens when varispeed transposition oscillates back and forth continuously? CDP’s modify speed Mode 6 applies sinusoidal tape vibrato with two parameters: modulation rate in Hz and pitch swing depth in semitones. Because this is true time-domain resampling, both pitch and micro-timing sway together.',
        'At musical rates (around 5 Hz and 1 semitone), the voice acquires a gentle, expressive singing vibrato. Increasing the rate to 10–25 Hz and widening the depth to 3–4 semitones crosses the perceptual threshold where the ear stops tracking individual pitch rises and falls; instead, rapid frequency modulation (FM) sidebands erupt and the human voice dissolves into an alien, bubbling warble.',
      ],
      tip: 'Look closely at the spectrogram of the 25 Hz / 4-semitone vibrato: horizontal voice harmonics turn into rapid zigzag waves and smear into broad sideband clouds.',
      examples: [
        {
          id: 'm1-speed-vibrato',
          title: 'Tape Vibrato: Smooth Undulation to Alien Warble',
          summary: 'Applies modify speed Mode 6 to count.wav at musical settings (5 Hz, 1 st) versus extreme fast modulation (25 Hz, 4 st).',
          legacyOrigin: 'Workshop 1 — Worksheet 9 (ST40–ST43: MODIFY SPEED Mode 6)',
          programs: ['modify'],
          sourceAudio: 'count.wav',
          defaultViewMode: 'both',
          spectrogramColorMap: 'viridis',
          code: `const src = await loadAudio('count.wav');

// 1. Musical vibrato: 5 Hz rate, +/- 1 semitone pitch swing
const gentle = await cdp.process('modify', ['speed', '6', '$IN', '$OUT', '5', '1'], src);

// 2. Extreme vibrato: 25 Hz rate, +/- 4 semitone pitch swing -> alien FM-like warble
const alien = await cdp.process('modify', ['speed', '6', '$IN', '$OUT', '25', '4'], src);

output(gentle.bytes, 'Gentle Vibrato (5 Hz, 1 st)');
output(alien.bytes, 'Alien Vibrato (25 Hz, 4 st)');`,
          tryThis: [
            'Try intermediate settings like 10 Hz with depth 3 semitones to hear the transition from lyrical wobble to cartoon flutter.',
            'Use a slow 0.8 Hz rate with a wide 6-semitone depth to simulate a warped vinyl record or dying tape motor.',
            'Swap count.wav for capm.wav to hear how fast vibrato interacts with a lower male voice.',
          ],
        },
      ],
    },
  ],
};
