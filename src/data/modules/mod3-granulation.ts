import type { TutorialModule } from '../../types';

export const mod3Granulation: TutorialModule = {
  id: 'mod3-granulation',
  number: 3,
  title: 'Wavecycle Distortion, Loops & Granulation',
  subtitle: 'Reshaping individual wavecycles, looping and shredding time-domain chunks, and sculpting dense granular clouds with BRASSAGE and GRAIN.',
  category: 'Time Domain',
  visualFocus: 'waveform',
  overview: [
    'Between whole-soundfile edits and spectral FFT analysis lies a rich middle ground: operating on microscopic wavecycles and millisecond-scale audio grains directly in the time domain. CDP’s distort family slices audio at zero crossings to treat individual wavecycles as pitch and texture primitives.',
    'Scaling up from cycles to chunks, extend loop, extend scramble, and modify radical 2 (shred) rearrange phrases into stuttering patterns and watery streams. Finally, modify brassage and grain repitch unlock full granular synthesis—decoupling playback speed from pitch, evolving grain size and density through breakpoint files, and cycling detected grains through musical pitch sequences.',
  ],
  sources: ['count.wav', 'flex.wav', 'capmc.wav'],
  sections: [
    {
      id: 'm3-sec-distort',
      heading: 'Wavecycle Surgery with distort',
      prose: [
        'Unlike guitar overdrive that clips sample peaks, CDP’s distort programs parse the waveform into pseudo-wavecycles—complete positive-and-negative excursions bounded by zero crossings—and manipulate those cycles structurally. Because speech contains pitched vowel cycles alongside noisy fricatives, wavecycle processing transforms vocal character dramatically while keeping the underlying words eerily recognizable.',
        'In this four-way comparison on count.wav: distort repeat duplicates groups of 2 cycles twice (-c2), lengthening and deepening the voice into a gravelly growl; distort reverse flips groups of 500 cycles backwards so entire syllables turn inside out; distort multiply doubles each cycle’s frequency (shifting pitch up an octave without shortening duration); and distort pitch randomly warps every individual wavecycle within a time-varying octave range.',
      ],
      tip: 'Compare the durations in the waveform viewer: distort repeat doubles the file length, while distort reverse, multiply, and pitch stay close to the original 8-second span.',
      examples: [
        {
          id: 'm3-distort-wavecycles',
          title: 'Wavecycle Repeat, Reverse, Multiply & Time-Varying Pitchwarp',
          summary: 'Applies four structural wavecycle processes to count.wav: gravelly cycle repetition, 500-cycle syllable reversal, octave-up cycle multiplication, and time-varying random pitch warping.',
          legacyOrigin: 'Workshop 1 — Worksheet 9 (ST20, ST24, ST26–ST28) & Worksheet 1 (ST6)',
          programs: ['distort'],
          sourceAudio: 'count.wav',
          defaultViewMode: 'waveform',
          code: `const src = await loadAudio('count.wav');

// 1. Repeat: repeat groups of 2 wavecycles (-c2) 2 times -> deeper, rougher, twice as long
const repeated = await cdp.process('distort', ['repeat', '$IN', '$OUT', '2', '-c2'], src);

// 2. Reverse: flip chunks of 500 wavecycles backwards -> syllable-scale time reversal
const reversed = await cdp.process('distort', ['reverse', '$IN', '$OUT', '500'], src);

// 3. Multiply: double frequency of each wavecycle -> higher, cheeky voice (same length)
const multiplied = await cdp.process('distort', ['multiply', '$IN', '$OUT', '2'], src);

// 4. Pitchwarp: random pitch shift per wavecycle widening over time (fraction of an octave)
const warpCurve = text([
  '0.0  0.02',
  '1.5  0.02',
  '2.0  0.35',
  '4.5  0.35',
  '8.0  0.85',
].join('\\n'));

const warped = await cdp.process(
  'distort',
  ['pitch', '$IN', '$OUT', '/trpw.brk'],
  src,
  { extraInputs: { '/trpw.brk': warpCurve } },
);

output(repeated.bytes, 'distort repeat (2x, -c2)');
output(reversed.bytes, 'distort reverse (500 cycles)');
output(multiplied.bytes, 'distort multiply (2x freq)');
output(warped.bytes, 'distort pitch (time-varying warp)');`,
          tryThis: [
            'Lower distort reverse from 500 to 50 wavecycles for a broken, stuttering vocal texture where words remain almost intact.',
            'Try distort repeat with 4 repetitions and -c5 on flex.wav for extreme metallic crunch.',
            'Increase distort multiply from 2 to 3 (an octave plus a fifth) to hear harmonic distortion intensify.',
          ],
        },
      ],
    },
    {
      id: 'm3-sec-loop-shred',
      heading: 'Looping, Scrambling & Shredding Chunks',
      prose: [
        'Moving from wavecycles to larger time windows (50–300 ms) lets you stretch or shatter the macro-rhythm of a sound. CDP’s extend loop Mode 1 slides a reading window across the source: taking 100 ms segments while advancing only 20 ms each step creates an 80% overlap that stretches a 6.6-second flexatone into a hypnotic, chattering rhythmic texture.',
        'For stochastic reordering, extend scramble Mode 2 slices the source into chunks averaging 0.1 s and scatters them across 10 seconds with scatter factor 3, mincing the flexatone into unpredictable bursts. Taking fragmentation even further, modify radical Mode 2 (shred) repeatedly cuts and permutes the entire soundfile in place: 10 passes produce a burbling jumble of syllables, while 100 passes dissolve spoken counting into a continuous watery babble.',
      ],
      examples: [
        {
          id: 'm3-loop-scramble-shred',
          title: 'Overlapping Loop Texture, Scramble & Watery Shred',
          summary: 'Transforms flex.wav into overlapping loop textures (extend loop) and erratic minced chunks (extend scramble), then shreds count.wav 100 times into a watery stream.',
          legacyOrigin: 'Workshop 1 — Worksheet 3 (ST4, ST7) & Worksheet 9 (ST35–ST36)',
          programs: ['extend', 'modify'],
          sourceAudio: 'flex.wav',
          extraSources: ['count.wav'],
          defaultViewMode: 'waveform',
          code: `const flex = await loadAudio('flex.wav');
const count = await loadAudio('count.wav');

// 1. extend loop Mode 1: start=0 s, loop length=100 ms, advance step=20 ms (80% overlap)
const looped = await cdp.process(
  'extend',
  ['loop', '1', '$IN', '$OUT', '0', '100', '20'],
  flex,
);

// 2. extend scramble Mode 2: average chunk 0.1 s, scatter 3, output duration 10 s
const scrambled = await cdp.process(
  'extend',
  ['scramble', '2', '$IN', '$OUT', '0.1', '3', '10'],
  flex,
);

// 3. modify radical Mode 2 (shred): 100 permutations of 0.1 s chunks, scatter 8
const shredded = await cdp.process(
  'modify',
  ['radical', '2', '$IN', '$OUT', '100', '0.1', '-s8'],
  count,
);

output(looped.bytes, 'Flexatone: extend loop (100 ms / 20 ms step)');
output(scrambled.bytes, 'Flexatone: extend scramble Mode 2 (10 s)');
output(shredded.bytes, 'Voice: modify radical 2 shred (100 passes)');`,
          tryThis: [
            'In extend loop, change 100 / 20 to 300 / 100 ms to hear distinct repeating musical motifs instead of a dense buzz.',
            'Reduce shred passes from 100 to 10 (and -s8 to -s4) to hear recognizable syllable burbles before the voice turns to water.',
            'Try extend scramble Mode 1 with chunk bounds 0.06 and 0.2 s ("scramble", "1", "$IN", "$OUT", "0.06", "0.2", "10").',
          ],
        },
      ],
    },
    {
      id: 'm3-sec-brassage-basic',
      heading: 'Granulation & Elastic Time-Stretch with modify brassage',
      prose: [
        'CDP’s modify brassage is a classic time-domain granular synthesis engine that breaks an audio file into overlapping windowed grains (typically 25–100 ms) and reassembles them along a new timeline. Because each grain plays at its original sample rate while the read pointer advances independently, you can stretch a sound dramatically without altering its pitch.',
        'Mode 5 (granulate) focuses on grain density: a value of 0.75 opens microscopic gaps between grains, roughening the smooth flexatone into a crisp, sparkling surface. Mode 2 (time-stretch) controls velocity—the speed at which the read pointer traverses the input. A velocity of 0.25 advances at quarter speed, yielding a 4× time-stretch. Supplying a breakpoint file lets velocity breathe dynamically: starting at 4× stretch (0.25), accelerating to normal speed (1.0), and slowing to a vast 10× stretch (0.1).',
      ],
      tip: 'Remember that velocity in modify brassage is the inverse of stretch factor: velocity = 1 / stretch. So 0.5 = 2× longer, 0.25 = 4× longer, and 0.1 = 10× longer.',
      examples: [
        {
          id: 'm3-brassage-granulate-stretch',
          title: 'Granular Roughening & Time-Varying Granular Time-Stretch',
          summary: 'Compares sparse granulation (Mode 5, density 0.75), fixed 4× granular time-stretch (Mode 2, velocity 0.25), and elastic breakpoint-driven stretching on flex.wav.',
          legacyOrigin: 'Workshop 1 — Worksheet 3 (ST8–ST9, ST11: MODIFY BRASSAGE Modes 2 & 5)',
          programs: ['modify'],
          sourceAudio: 'flex.wav',
          defaultViewMode: 'waveform',
          code: `const src = await loadAudio('flex.wav');

// 1. Mode 5 (granulate): density 0.75 opens subtle gaps between grains
const grainy = await cdp.process('modify', ['brassage', '5', '$IN', '$OUT', '0.75'], src);

// 2. Mode 2 (time-stretch): fixed velocity 0.25 -> 4x longer without pitch change
const stretch4x = await cdp.process('modify', ['brassage', '2', '$IN', '$OUT', '0.25'], src);

// 3. Mode 2 with breakpoint velocity: 4x stretch -> normal speed -> 10x stretch
const velCurve = text([
  '0.0  0.25',
  '3.0  1.00',
  '6.0  0.10',
].join('\\n'));

const elastic = await cdp.process(
  'modify',
  ['brassage', '2', '$IN', '$OUT', '/flexgrnstrtv.brk'],
  src,
  { extraInputs: { '/flexgrnstrtv.brk': velCurve } },
);

output(grainy.bytes, 'Mode 5: Granulate (density 0.75)');
output(stretch4x.bytes, 'Mode 2: Fixed 4x Stretch (vel 0.25)');
output(elastic.bytes, 'Mode 2: Elastic Stretch (0.25 -> 1.0 -> 0.1)');`,
          tryThis: [
            'Lower Mode 5 density from 0.75 to 0.35 for a sparse, pointillistic scatter of isolated metallic clicks.',
            'Try Mode 4 (scramble) with a grain-size breakpoint file going from 25 ms to 200 ms: ["brassage", "4", "$IN", "$OUT", "/g.brk"].',
            'Swap flex.wav for count.wav at velocity 0.35 to hear granular speech stretching vs spectral stretching in Module 4.',
          ],
        },
      ],
    },
    {
      id: 'm3-sec-brassage-full',
      heading: 'Full-Parameter Evolving Granular Clouds',
      prose: [
        'Mode 7 of modify brassage exposes the entire granular synthesis architecture at once: velocity, density, grainsize, pitch transposition range, amplitude range, stereo spatial spread, and grain fade-in/fade-out splice lengths—each given as paired low/high bounds so grains randomize within controlled envelopes. Because every major parameter accepts its own breakpoint file, a single 6.6-second mono flexatone can blossom into a 26-second wide-stereo cloud that constantly shifts in character.',
        'In this classic workshop preset, velocity stays at 0.25 (4× stretch) while density plunges from a thick 75-layer swarm down to a sparse 2 grains at 1 second before swelling to 100 at the climax. Simultaneously, grainsize expands from 30 ms to 100 ms and settles at 60 ms, while random pitch scatter tightens from ±7 semitones to ±1 semitone and fans outward to ±11 semitones across the stereo field.',
      ],
      tip: 'Because Mode 7 spreads grains across stereo space (0.5 to 1.0), notice how the mono flexatone automatically blooms into a stereo output file.',
      examples: [
        {
          id: 'm3-brassage-full-cloud',
          title: 'Evolving Stereo Granular Cloud (modify brassage Mode 7)',
          summary: 'Drives density, grainsize, and ±pitch scatter simultaneously via four inline breakpoint files, turning a 6.6 s flexatone into a sweeping 26 s stereo granular cloud.',
          legacyOrigin: 'Workshop 1 — Worksheet 3 (ST12: MODIFY BRASSAGE Mode 7)',
          programs: ['modify'],
          sourceAudio: 'flex.wav',
          defaultViewMode: 'both',
          spectrogramColorMap: 'magma',
          code: `const src = await loadAudio('flex.wav');

// Breakpoint envelopes over the 6.6 s source timeline
const density = text([
  '0.0   75',
  '1.0    2',
  '6.0  100',
].join('\\n'));

const grainsize = text([
  '0.0   30',
  '1.0  100',
  '6.0   60',
].join('\\n'));

const pitchLo = text([
  '0.0   -7',
  '1.0   -1',
  '6.0  -11',
].join('\\n'));

const pitchHi = text([
  '0.0    7',
  '1.0    1',
  '6.0   11',
].join('\\n'));

// Mode 7 positional parameters:
// velocity, density, hvelocity, hdensity,
// grainsize, pitchshift, amp, space, bsplice, esplice,
// hgrainsize, hpitchshift, hamp, hspace, hbsplice, hesplice
const cloud = await cdp.process(
  'modify',
  [
    'brassage', '7', '$IN', '$OUT',
    '0.25', '/dens.brk', '0.25', '/dens.brk',
    '/gsize.brk', '/pchlo.brk', '0.5', '0.5', '10', '10',
    '/gsize.brk', '/pchhi.brk', '1', '1', '10', '10',
  ],
  src,
  {
    extraInputs: {
      '/dens.brk': density,
      '/gsize.brk': grainsize,
      '/pchlo.brk': pitchLo,
      '/pchhi.brk': pitchHi,
    },
  },
);

output(cloud.bytes, 'Evolving Stereo Granular Cloud (4x stretch)');`,
          tryThis: [
            'Add jitter and wander flags "-j0.75" and "-r500" (500 ms search range) to the argument array for looser, cloudier grain placement.',
            'Collapse pitchLo and pitchHi to "0.0 -0.2" / "0.0 0.2" to transform the wild pitch cloud into a lush microtonal chorus.',
            'Swap flex.wav for count.wav with velocity 0.5 to turn spoken counting into a swirling stereo crowd of whispering voices.',
          ],
        },
      ],
    },
    {
      id: 'm3-sec-grain-repitch',
      heading: 'Amplitude-Detected Grains & Pitch Cycling (grain repitch)',
      prose: [
        'Whereas modify brassage slices audio on an arbitrary time grid, CDP’s grain suite actually listens to the waveform’s amplitude envelope, detecting individual acoustic grains wherever energy rises above and falls below a gate threshold. To give grain clear boundaries on a continuous spoken phrase, we first pass capmc.wav (a crisp 1.9-second excerpt from the male voice) through a light granulation step (modify brassage 5 with density 0.9) that introduces subtle micro-separations.',
        'Next, grain repitch reads a list of semitone transpositions—here an undulating wave ascending +1, +2, +3 semitones and dipping down to -3—and repitches each detected grain. In Mode 1, each successive grain receives the next pitch in the list, making the voice ripple up and down melodically. In Mode 2, every single grain is repeated across the entire 13-step pitch cycle before moving to the next grain, dramatically stretching the 1.9-second phrase into a ~22-second bubbling arpeggiated ribbon.',
      ],
      examples: [
        {
          id: 'm3-grain-repitch',
          title: 'Granulate + grain repitch Mode 1 (Cycle) vs Mode 2 (Repeat)',
          summary: 'Lightly granulates capmc.wav (density 0.9) and feeds it to grain repitch with a 13-step undulating semitone cycle in both stepping (Mode 1) and grain-repeating (Mode 2) modes.',
          legacyOrigin: 'Workshop 1 — Worksheet 1 (ST8–ST9: MODIFY BRASSAGE 5 & GRAIN REPITCH)',
          programs: ['modify', 'grain'],
          sourceAudio: 'capmc.wav',
          defaultViewMode: 'both',
          spectrogramColorMap: 'viridis',
          code: `const src = await loadAudio('capmc.wav');

// Step 1: Lightly granulate so grain repitch has crisp amplitude dips to detect
const grainy = await cdp.process('modify', ['brassage', '5', '$IN', '$OUT', '0.9'], src);

// Undulating semitone cycle (0 -> +3 -> 0 -> -3 -> 0)
const pitchCycle = text('0 1 2 3 2 1 0 -1 -2 -3 -2 -1 0\\n');

// Step 2a: Mode 1 — apply next pitch to each successive grain
const mode1 = await cdp.process(
  'grain',
  ['repitch', '1', '$IN', '$OUT', '/grntr.txt'],
  grainy.bytes,
  { extraInputs: { '/grntr.txt': pitchCycle } },
);

// Step 2b: Mode 2 — repeat EVERY grain through the entire pitch cycle before advancing
const mode2 = await cdp.process(
  'grain',
  ['repitch', '2', '$IN', '$OUT', '/grntr.txt'],
  grainy.bytes,
  { extraInputs: { '/grntr.txt': pitchCycle } },
);

output(mode1.bytes, 'grain repitch Mode 1 (step per grain)');
output(mode2.bytes, 'grain repitch Mode 2 (repeat each grain across cycle)');`,
          tryThis: [
            'Replace the chromatic wave in pitchCycle with a wide pentatonic arpeggio like "0 4 7 12 7 4 0 -5".',
            'Lower the initial brassage density from 0.9 to 0.7 to create sharper, more distinct staccato grains.',
            'Try passing count.wav directly into grain repitch Mode 1 without pre-granulation to hear how natural syllable breaks trigger the cycle.',
          ],
        },
      ],
    },
  ],
};
