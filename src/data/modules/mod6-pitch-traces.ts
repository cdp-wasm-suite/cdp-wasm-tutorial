import type { TutorialModule } from '../../types';

export const mod6PitchTraces: TutorialModule = {
  id: 'mod6-pitch-traces',
  number: 6,
  title: 'Pitch Traces & Cross-Pitching',
  subtitle: 'Extracting fundamental pitch contours (.frq), reshaping melodies algebraically, and grafting one sound’s pitch onto another',
  category: 'Spectral (PVOC)',
  visualFocus: 'spectrum',
  overview: [
    'Once a sound is in the phase-vocoder spectral domain, CDP can estimate its fundamental frequency window by window and store that trajectory in a binary pitch trace file (`.frq`). Separating pitch from timbre lets you treat melody as pure data.',
    'In this module you will extract and audition pitch traces, transform a vocal melody with exaggeration, inversion, scale quantisation, and smoothing, and finally cross-pitch two completely different recordings—making a Tibetan singing bowl sing a human vocal melody and flattening a human voice into a metallic bowl drone.',
  ],
  sources: ['vocalsnd.wav', 'bellsnd.wav', 'drumsnd.wav'],
  sections: [
    {
      id: 'm6-extract',
      heading: 'Extracting & Auditioning a Pitch Trace (.frq)',
      prose: [
        '`repitch getpitch 1` scans every window of a `.ana` file to track its fundamental pitch and writes two outputs simultaneously: a `.frq` pitch-data file for downstream mathematical processing, and a synthetic `.ana` file containing a pure pitch-following tone so you can resynthesise and verify how accurately CDP tracked the melody.',
        'Auditioning the pitch trace is an essential diagnostic step before transforming or cross-pitching sounds. Comparing a melodic vocal phrase (`vocalsnd.wav`) against a resonant Tibetan bowl (`bellsnd.wav`) immediately shows the difference between an expressive gliding contour and a near-stationary pitched drone.',
      ],
      tip: 'Look at the two spectrograms side by side: the vocal trace draws clear, swooping curves with brief gaps during unvoiced consonants, while the Tibetan bowl trace forms a steady, nearly horizontal ribbon.',
      examples: [
        {
          id: 'm6-getpitch-audition',
          title: 'Extract & Audition Fundamental Pitch Traces',
          summary: 'Run `repitch getpitch 1` on both a sung phrase and a Tibetan bowl to extract `.frq` data and listen to the tracked pitch contours directly.',
          legacyOrigin: 'Workshop 3 — Lesson 3 & Lesson 6',
          programs: ['pvoc', 'repitch'],
          sourceAudio: 'vocalsnd.wav',
          extraSources: ['bellsnd.wav'],
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'inferno',
          code: `const vocWav = await loadAudio('vocalsnd.wav');
const bellWav = await loadAudio('bellsnd.wav');

// 1. Extract and audition the vocal pitch contour
const vocAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], vocWav, { outExt: 'ana' });
const vocPitch = await cdp.run(
  'repitch',
  ['getpitch', '1', '/in.ana', '/hear.ana', '/voc.frq'],
  { inputs: { '/in.ana': vocAna.bytes }, outputs: ['/hear.ana', '/voc.frq'] }
);
const vocHear = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], vocPitch.outputs['/hear.ana'], { inExt: 'ana' });
output(vocHear.bytes, '1. Audible pitch trace: vocalsnd.wav');

// 2. Extract and audition the Tibetan bowl pitch contour
const bellAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], bellWav, { outExt: 'ana' });
const bellPitch = await cdp.run(
  'repitch',
  ['getpitch', '1', '/in.ana', '/hear.ana', '/bell.frq'],
  { inputs: { '/in.ana': bellAna.bytes }, outputs: ['/hear.ana', '/bell.frq'] }
);
const bellHear = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], bellPitch.outputs['/hear.ana'], { inExt: 'ana' });
output(bellHear.bytes, '2. Audible pitch trace: bellsnd.wav');

log('Extracted vocal .frq (' + vocPitch.outputs['/voc.frq'].length + ' bytes) and bell .frq (' + bellPitch.outputs['/bell.frq'].length + ' bytes).');`,
          tryThis: [
            'Swap `bellsnd.wav` for `drumsnd.wav` to see what `repitch getpitch` extracts from a noisy, percussive source.',
            'Add `-s20` (minimum signal-to-noise ratio) or `-t2` (tuning tolerance in semitones) to `repitch getpitch 1` to see how tracking sensitivity changes.',
            'Compare the tracked voice trace against `hornsnd.wav` to observe steady brass vibrato.',
          ],
        },
      ],
    },
    {
      id: 'm6-reshape',
      heading: 'Reshaping Contours: Exaggerate, Invert, Quantise & Smooth',
      prose: [
        'Every `repitch` contour-shaping tool comes in paired modes: one outputs a modified `.frq` pitch file (so you can chain further pitch operations), and the other outputs a `.trn` transposition-ratio file (the exact window-by-window shift needed to turn the original sound into the new contour). Passing that `.trn` file into `repitch transpose 4` applies the reshaped melody back onto the original `.ana` spectrum.',
        'Chaining `repitch exag` (stretching pitch intervals away from a mean pitch) into `repitch invert` (mirroring every upward inflection downward and vice versa) turns a familiar vocal line into an upside-down, hyper-expressive caricature. Feeding a pitch trace into `repitch quantise` snaps continuous vocal glides onto discrete notes of a musical scale, while `repitch smooth` averages out rapid jitter over a millisecond window to create liquid portamento.',
      ],
      tip: 'In the spectrogram of `m6-exag-invert`, watch the sweeping bright ridges reverse direction: peaks in the original melody become deep troughs after `repitch invert`.',
      examples: [
        {
          id: 'm6-exag-invert',
          title: 'Exaggerate & Invert a Vocal Pitch Contour',
          summary: 'Widen the sung vocal melody around MIDI 55 with `repitch exag`, then mirror every rise into a fall with `repitch invert` before applying the contour back.',
          legacyOrigin: 'Workshop 3 — Lesson 5',
          programs: ['pvoc', 'repitch'],
          sourceAudio: 'vocalsnd.wav',
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'magma',
          code: `const wav = await loadAudio('vocalsnd.wav');
const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], wav, { outExt: 'ana' });

// Step 1: Extract raw pitch trace (.frq)
const gp = await cdp.run(
  'repitch',
  ['getpitch', '1', '/in.ana', '/hear.ana', '/v.frq'],
  { inputs: { '/in.ana': ana.bytes }, outputs: ['/v.frq'] }
);

// Step 2a: Exaggerate pitch intervals around MIDI 55 (Mode 6 outputs .trn directly)
// Args: meanpitch=55, range=18 semitones, contour=1
const exagTrn = await cdp.run(
  'repitch',
  ['exag', '6', '/v.frq', '/exag.trn', '55', '18', '1'],
  { inputs: { '/v.frq': gp.outputs['/v.frq'] }, outputs: ['/exag.trn'] }
);
const exagAna = await cdp.run(
  'repitch',
  ['transpose', '4', '/in.ana', '/exag.trn', '/out.ana'],
  { inputs: { '/in.ana': ana.bytes, '/exag.trn': exagTrn.outputs['/exag.trn'] }, outputs: ['/out.ana'] }
);
const exagWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], exagAna.outputs['/out.ana'], { inExt: 'ana' });
output(exagWav.bytes, '1. Exaggerated contour (repitch exag)');

// Step 2b: Chain Mode 5 (.frq output) -> repitch invert Mode 2 (.trn output)
// invert arg 0 = invert around the contour's own mean pitch
const exagFrq = await cdp.run(
  'repitch',
  ['exag', '5', '/v.frq', '/exag.frq', '55', '18', '1'],
  { inputs: { '/v.frq': gp.outputs['/v.frq'] }, outputs: ['/exag.frq'] }
);
const invTrn = await cdp.run(
  'repitch',
  ['invert', '2', '/exag.frq', '/inv.trn', '0'],
  { inputs: { '/exag.frq': exagFrq.outputs['/exag.frq'] }, outputs: ['/inv.trn'] }
);
const invAna = await cdp.run(
  'repitch',
  ['transpose', '4', '/in.ana', '/inv.trn', '/out.ana'],
  { inputs: { '/in.ana': ana.bytes, '/inv.trn': invTrn.outputs['/inv.trn'] }, outputs: ['/out.ana'] }
);
const invWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], invAna.outputs['/out.ana'], { inExt: 'ana' });
output(invWav.bytes, '2. Exaggerated + Inverted (repitch invert)');

log('Applied exaggeration and melodic inversion via .frq -> .trn pipeline.');`,
          tryThis: [
            'Lower the exaggeration range from `18` to `6` for a subtler, more natural inverted melody.',
            'Change the `repitch invert` pivot from `0` (auto mean) to an explicit MIDI pitch like `62` to shift the mirror axis.',
            'Replace `repitch transpose 4` with `repitch transposef 4 /in.ana /inv.trn /out.ana -f12` to preserve vocal formants during the extreme pitch swings.',
          ],
        },
        {
          id: 'm6-quantise-smooth',
          title: 'Scale Quantisation & Contour Smoothing',
          summary: 'Snap a singing voice onto a fixed open-fifths scale with `repitch quantise`, then compare hard stepped pitches against a 500 ms `repitch smooth` glide.',
          legacyOrigin: 'Workshop 3 — Lesson 5',
          programs: ['pvoc', 'repitch'],
          sourceAudio: 'vocalsnd.wav',
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'viridis',
          code: `const wav = await loadAudio('vocalsnd.wav');

// Inline MIDI pitch set: C4, G4, C5, G5, C6 (open fifths & octaves)
// The -o flag repeats this pitch set across all octaves.
const scaleSet = text('60 67 72 79 84\\n');

const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], wav, { outExt: 'ana' });
const gp = await cdp.run(
  'repitch',
  ['getpitch', '1', '/in.ana', '/hear.ana', '/v.frq'],
  { inputs: { '/in.ana': ana.bytes }, outputs: ['/v.frq'] }
);

// 1. Stepped quantisation (Mode 2 outputs .trn directly)
const qTrn = await cdp.run(
  'repitch',
  ['quantise', '2', '/v.frq', '/q.trn', '/scale.txt', '-o'],
  { inputs: { '/v.frq': gp.outputs['/v.frq'], '/scale.txt': scaleSet }, outputs: ['/q.trn'] }
);
const qAna = await cdp.run(
  'repitch',
  ['transpose', '4', '/in.ana', '/q.trn', '/out.ana'],
  { inputs: { '/in.ana': ana.bytes, '/q.trn': qTrn.outputs['/q.trn'] }, outputs: ['/out.ana'] }
);
const qWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], qAna.outputs['/out.ana'], { inExt: 'ana' });
output(qWav.bytes, '1. Stepped scale quantisation (repitch quantise 2)');

// 2. Quantise to .frq (Mode 1), then smooth transitions over 500 ms (repitch smooth 2)
const qFrq = await cdp.run(
  'repitch',
  ['quantise', '1', '/v.frq', '/q.frq', '/scale.txt', '-o'],
  { inputs: { '/v.frq': gp.outputs['/v.frq'], '/scale.txt': scaleSet }, outputs: ['/q.frq'] }
);
const smTrn = await cdp.run(
  'repitch',
  ['smooth', '2', '/q.frq', '/sm.trn', '500'],
  { inputs: { '/q.frq': qFrq.outputs['/q.frq'] }, outputs: ['/sm.trn'] }
);
const smAna = await cdp.run(
  'repitch',
  ['transpose', '4', '/in.ana', '/sm.trn', '/out.ana'],
  { inputs: { '/in.ana': ana.bytes, '/sm.trn': smTrn.outputs['/sm.trn'] }, outputs: ['/out.ana'] }
);
const smWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], smAna.outputs['/out.ana'], { inExt: 'ana' });
output(smWav.bytes, '2. Quantised + 500 ms smoothed (repitch smooth 2)');

log('Compared hard stepped pitch quantisation against 500 ms contour smoothing.');`,
          tryThis: [
            'Edit `scaleSet` to a tight chromatic cluster (`54 55 56`) or a pentatonic scale (`60 62 64 67 69`) and re-run.',
            'Change the `repitch smooth` timeframe from `500` ms to `150` ms (subtle softening) or `1200` ms (slow portamento).',
            'Insert `repitch vibrato 2` (`12 2` for 12 Hz rate, 2-semitone depth) after `quantise 1` to add synthetic vibrato onto the quantised notes.',
          ],
        },
      ],
    },
    {
      id: 'm6-crosspitch',
      heading: 'Cross-Pitching Between Different Sounds',
      prose: [
        'Because `.frq` files represent pure pitch trajectories divorced from timbre, `repitch combine 1` can compute the exact transposition file (`.trn`) needed to turn Sound A’s pitch contour into Sound B’s pitch contour. Applying that `.trn` to Sound A via `repitch transpose 4` grafts Sound B’s melody directly onto Sound A’s timbre.',
        'Cross-pitching is completely bidirectional. Imposing the sung vocal phrase onto the Tibetan singing bowl (`bell.frq` → `voc.frq`) makes the metallic bowl glide and sing like a choir; reversing the direction (`voc.frq` → `bell.frq`) drains the melody out of the human singer, locking the voice onto the bowl’s steady resonant pitch.',
      ],
      tip: 'Compare both outputs in Spectrum view: the first output has the bowl’s sparse metallic overtones moving along the singer’s sweeping curves, while the second has the voice’s dense harmonic stack flattened into horizontal stripes.',
      examples: [
        {
          id: 'm6-cross-pitch',
          title: 'Bidirectional Cross-Pitching: Singing Bowl × Human Voice',
          summary: 'Use `repitch combine 1` to graft the vocal melody onto a Tibetan bowl—and then reverse the transfer to lock the human voice onto the bowl’s drone pitch.',
          legacyOrigin: 'Workshop 3 — Lesson 6',
          programs: ['pvoc', 'repitch'],
          sourceAudio: 'bellsnd.wav',
          extraSources: ['vocalsnd.wav'],
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'inferno',
          code: `const bellWav = await loadAudio('bellsnd.wav');
const vocWav = await loadAudio('vocalsnd.wav');

// Analyse both sounds and extract their .frq pitch traces
const bellAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], bellWav, { outExt: 'ana' });
const vocAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], vocWav, { outExt: 'ana' });

const bellGp = await cdp.run(
  'repitch',
  ['getpitch', '1', '/in.ana', '/hear.ana', '/bell.frq'],
  { inputs: { '/in.ana': bellAna.bytes }, outputs: ['/bell.frq'] }
);
const vocGp = await cdp.run(
  'repitch',
  ['getpitch', '1', '/in.ana', '/hear.ana', '/voc.frq'],
  { inputs: { '/in.ana': vocAna.bytes }, outputs: ['/voc.frq'] }
);

// Direction 1: bell.frq -> voc.frq (Tibetan bowl sings the vocal melody)
const b2vTrn = await cdp.run(
  'repitch',
  ['combine', '1', '/bell.frq', '/voc.frq', '/b2v.trn'],
  { inputs: { '/bell.frq': bellGp.outputs['/bell.frq'], '/voc.frq': vocGp.outputs['/voc.frq'] }, outputs: ['/b2v.trn'] }
);
const b2vAna = await cdp.run(
  'repitch',
  ['transpose', '4', '/bell.ana', '/b2v.trn', '/out.ana'],
  { inputs: { '/bell.ana': bellAna.bytes, '/b2v.trn': b2vTrn.outputs['/b2v.trn'] }, outputs: ['/out.ana'] }
);
const b2vWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], b2vAna.outputs['/out.ana'], { inExt: 'ana' });
output(b2vWav.bytes, '1. Tibetan bowl singing the vocal melody');

// Direction 2: voc.frq -> bell.frq (Human voice locked to the bowl pitch)
const v2bTrn = await cdp.run(
  'repitch',
  ['combine', '1', '/voc.frq', '/bell.frq', '/v2b.trn'],
  { inputs: { '/voc.frq': vocGp.outputs['/voc.frq'], '/bell.frq': bellGp.outputs['/bell.frq'] }, outputs: ['/v2b.trn'] }
);
const v2bAna = await cdp.run(
  'repitch',
  ['transpose', '4', '/voc.ana', '/v2b.trn', '/out.ana'],
  { inputs: { '/voc.ana': vocAna.bytes, '/v2b.trn': v2bTrn.outputs['/v2b.trn'] }, outputs: ['/out.ana'] }
);
const v2bWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], v2bAna.outputs['/out.ana'], { inExt: 'ana' });
output(v2bWav.bytes, '2. Human voice flattened to the bowl pitch');

log('Completed bidirectional cross-pitching between bellsnd.wav and vocalsnd.wav.');`,
          tryThis: [
            'Swap `bellsnd.wav` for `drumsnd.wav` so the drum riff’s pitched hits follow the sung melody.',
            'On Direction 2, change `repitch transpose 4` to `repitch transposef 4 /voc.ana /v2b.trn /out.ana -f12` to keep the singer’s vowels intact on the monotone bowl pitch.',
            'Insert `repitch pchshift /voc.frq /voc_up.frq 12` before `repitch combine 1` to make the bowl sing the melody an octave higher.',
          ],
        },
      ],
    },
  ],
};
