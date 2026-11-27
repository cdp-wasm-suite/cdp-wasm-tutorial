import type { TutorialModule } from '../../types';

export const mod7Morphing: TutorialModule = {
  id: 'mod7-morphing',
  number: 7,
  title: 'Envelopes, Vocoding, Cross-Synthesis & Morphing',
  subtitle: 'Imprinting amplitude and spectral contours across sounds, cross-synthesising timbres, and constructing multi-stage spectral morphs',
  category: 'Composition & Synthesis',
  visualFocus: 'both',
  overview: [
    'Some of the richest transformations in electroacoustic sound design happen when two recordings exchange acoustic identities: one supplies the temporal rhythm or vocal tract shape while the other supplies the raw spectral body.',
    'This module moves systematically from time-domain amplitude imprinting (`envel replace`) and cross-modulation (`modify radical 6`), through bidirectional spectral vocoding (`formants vocode`) and time-varying cross-synthesis (`combine cross`), up to true multi-stage spectral morphing (`morph morph`) and frozen-window spectral glides (`spec grab` + `morph glide`).',
  ],
  sources: ['trcdt.wav', 'frogs3cdt.wav', 'gongvib.wav', 'count.wav', 'donkey1g44.wav'],
  sections: [
    {
      id: 'm7-envelopes',
      heading: 'Time-Domain Amplitude Envelope Transfer',
      prose: [
        'Before touching frequency spectra, you can transfer pure rhythmic energy between two recordings in the time domain. `envel replace 1` scans the amplitude envelope of a lively second sound (using a sliding window in milliseconds—here 5 ms) and imposes that loudness contour onto a steady first sound.',
        'Pairing an idling tractor (`trcdt.wav`, continuous broadband chugging) with chirping frogs (`frogs3cdt.wav`, crisp rhythmic bursts) makes the effect immediately visible in the waveform: the steady tractor engine is carved into frog-shaped pulses. Merging the original frogs with the enveloped tractor staggered by 0.1 seconds (`submix merge -s0.1`) creates a tightly synchronised rhythmic shadow.',
      ],
      tip: 'Look at the Waveform view: the dense rectangular block of the idling tractor breaks into spiky bursts matching the frogs’ chirrups, and the 0.1 s shadow merge doubles every transient.',
      examples: [
        {
          id: 'm7-envel-replace',
          title: 'Amplitude Imprinting & 0.1 s Shadow Merge',
          summary: 'Carve the steady idling tractor into rhythmic bursts using the frogs’ amplitude contour (`envel replace 1`), then layer it as a 0.1 s shadow (`submix merge`).',
          legacyOrigin: 'Workshop 1 — Worksheet 7 (ST1)',
          programs: ['envel', 'submix'],
          sourceAudio: 'trcdt.wav',
          extraSources: ['frogs3cdt.wav'],
          defaultViewMode: 'waveform',
          spectrogramColorMap: 'inferno',
          code: `const tractor = await loadAudio('trcdt.wav');
const frogs = await loadAudio('frogs3cdt.wav');

// 1. Impose the frogs' amplitude envelope onto the tractor (5 ms window)
const envRes = await cdp.run(
  'envel',
  ['replace', '1', '/tractor.wav', '/frogs.wav', '/env.wav', '5'],
  { inputs: { '/tractor.wav': tractor, '/frogs.wav': frogs }, outputs: ['/env.wav'] }
);
const enveloped = envRes.outputs['/env.wav'];
output(enveloped, '1. Tractor shaped by frog envelope (envel replace)');

// 2. Merge frogs + enveloped tractor staggered by 0.1 s for a shadow effect
const mergeRes = await cdp.run(
  'submix',
  ['merge', '/frogs.wav', '/env.wav', '/shadow.wav', '-s0.1'],
  { inputs: { '/frogs.wav': frogs, '/env.wav': enveloped }, outputs: ['/shadow.wav'] }
);
output(mergeRes.outputs['/shadow.wav'], '2. Frogs + 0.1 s shadowed tractor (submix merge)');

log('Transferred frog amplitude contour onto tractor and created 0.1 s shadow merge.');`,
          tryThis: [
            'Increase the `envel replace` window size from `5` ms to `40` ms to smooth out the choppy transients into softer swells.',
            'Swap the input order (`/frogs.wav` first, `/tractor.wav` second) to hear the steady tractor envelope flatten the frog chirps.',
            'Change the stagger `-s0.1` to `-s0` (synchronous) or `-s0.25` (distinct rhythmic echo).',
          ],
        },
      ],
    },
    {
      id: 'm7-vocoding',
      heading: 'Bidirectional Spectral Vocoding & Cross-Synthesis',
      prose: [
        'While `envel replace` transfers only overall loudness, `formants vocode` transfers the entire frequency-dependent spectral envelope—the moving resonances and formant peaks—from the second analysis file onto the spectral carrier of the first. Running it in both directions yields two distinct hybrids: frogs speaking through a tractor engine (`-p12`, 12 pitchwise bands/octave), versus frogs chirping with the woody rumble of a tractor (`-f4`, 4 frequency channels/band).',
        '`combine cross` performs spectral cross-synthesis by replacing the spectral amplitudes of the first sound with those of the second according to an interpolation factor `-i` between 0 and 1. Driving `-i` with an inline breakpoint file (`0 → 1` over 10 seconds) turns cross-synthesis into a gradual timbral cross-dissolve where the tractor steadily evaporates into the frogs.',
      ],
      tip: 'In the spectrogram of `m7-combine-cross`, trace from left (0 s) to right (10 s): low mechanical bands gradually fade out as high rhythmic frog-chirp clusters emerge seamlessly from inside the same spectrum.',
      examples: [
        {
          id: 'm7-formants-vocode',
          title: 'Bidirectional Spectral Vocoding (Tractor × Frogs)',
          summary: 'Swap spectral envelopes in both directions with `formants vocode`, comparing pitchwise (`-p12`) and frequency-wise (`-f4`) formant extraction.',
          legacyOrigin: 'Workshop 1 — Worksheet 7 (ST2–ST3)',
          programs: ['pvoc', 'formants'],
          sourceAudio: 'trcdt.wav',
          extraSources: ['frogs3cdt.wav'],
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'inferno',
          code: `const tractor = await loadAudio('trcdt.wav');
const frogs = await loadAudio('frogs3cdt.wav');

const trAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], tractor, { outExt: 'ana' });
const frAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], frogs, { outExt: 'ana' });

// Direction 1: Frogs' spectral envelope imposed on the tractor (-p12 pitchwise, 100-10000 Hz)
const t2f = await cdp.run(
  'formants',
  ['vocode', '/tr.ana', '/fr.ana', '/out.ana', '-p12', '-l100', '-h10000'],
  { inputs: { '/tr.ana': trAna.bytes, '/fr.ana': frAna.bytes }, outputs: ['/out.ana'] }
);
const t2fWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], t2f.outputs['/out.ana'], { inExt: 'ana' });
output(t2fWav.bytes, '1. Frogs into tractor (-p12 pitchwise)');

// Direction 2: Tractor's spectral envelope imposed on the frogs (-f4 frequency-wise)
const f2t = await cdp.run(
  'formants',
  ['vocode', '/fr.ana', '/tr.ana', '/out.ana', '-f4', '-l100', '-h10000'],
  { inputs: { '/fr.ana': frAna.bytes, '/tr.ana': trAna.bytes }, outputs: ['/out.ana'] }
);
const f2tWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], f2t.outputs['/out.ana'], { inExt: 'ana' });
output(f2tWav.bytes, '2. Tractor into frogs (-f4 frequency-wise)');

log('Rendered bidirectional spectral vocoding between tractor and frogs.');`,
          tryThis: [
            'Change `-p12` to `-p4` (broader formant bands) or `-p24` (razor-sharp resonant detail) and notice how intelligibility shifts.',
            'Try replacing `frogs3cdt.wav` with `count.wav` so the idling tractor speaks the numbers 1 through 10.',
            'Narrow the active vocoding band from `-l100 -h10000` to `-l400 -h4000` to focus the transfer strictly in the midrange.',
          ],
        },
        {
          id: 'm7-combine-cross',
          title: 'Time-Varying Spectral Cross-Synthesis (`combine cross`)',
          summary: 'Ramp the spectral amplitude weighting from 0 to 1 over 10 seconds using an inline breakpoint curve, dissolving the tractor into the frogs.',
          legacyOrigin: 'Workshop 1 — Worksheet 8 (ST4)',
          programs: ['pvoc', 'combine'],
          sourceAudio: 'trcdt.wav',
          extraSources: ['frogs3cdt.wav'],
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'magma',
          code: `const tractor = await loadAudio('trcdt.wav');
const frogs = await loadAudio('frogs3cdt.wav');

// Interpolation weighting: 0.0 = 100% tractor amplitudes -> 1.0 = 100% frog amplitudes
const crossCurve = text([
  '0.0  0',
  '10.0 1',
].join('\\n') + '\\n');

const trAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], tractor, { outExt: 'ana' });
const frAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], frogs, { outExt: 'ana' });

const crossed = await cdp.run(
  'combine',
  ['cross', '/tr.ana', '/fr.ana', '/out.ana', '-i/tvccross.brk'],
  {
    inputs: { '/tr.ana': trAna.bytes, '/fr.ana': frAna.bytes, '/tvccross.brk': crossCurve },
    outputs: ['/out.ana'],
  }
);

const out = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], crossed.outputs['/out.ana'], { inExt: 'ana' });
log('Completed 10-second time-varying spectral cross-synthesis.');
return out.bytes;`,
          tryThis: [
            'Make the cross-synthesis oscillate back and forth (`0 0`, `3 1`, `6 0`, `10 1`) so the tractor and frogs trade dominance twice.',
            'Hold at a fixed hybrid blend (`-i0.35` instead of `-i/tvccross.brk`) to audition a steady surreal mixture.',
            'Add `-l` (linear amplitude interpolation) or swap the first and second input files to keep the frogs’ phase structure instead of the tractor’s.',
          ],
        },
      ],
    },
    {
      id: 'm7-morph-glide',
      heading: 'Multi-Stage Spectral Morphing, Glides & Cross-Modulation',
      prose: [
        'True spectral morphing (`morph morph 1`) interpolates both spectral amplitudes and spectral frequencies independently over chosen start/end times and curve exponents. Morphing two wildly dissimilar sounds directly—like a resonant vibrato gong (`gongvib.wav`) and a counting voice (`count.wav`)—can still sound like a fancy crossfade unless you build an acoustic bridge between them. The classic three-stage strategy first creates a talking gong (`formants vocode`), morphs that hybrid into the clear voice, and then morphs the pure gong into the hybrid-to-voice transition.',
        'At the opposite ends of the timbral-blending spectrum sit `morph glide` and `modify radical 6`. `spec grab` extracts a single frozen analysis window from each sound and `morph glide` stretches a smooth, linear spectral interpolation between those two static snapshots across 15 seconds. Meanwhile, `modify radical 6` performs raw time-domain cross-modulation—multiplying the sample streams of two recordings (`count.wav` × `donkey1g44.wav`) to generate sum-and-difference sidebands where neither sound survives untouched.',
      ],
      tip: 'In `m7-three-stage-morph`, listen around 5–10 seconds: the gong’s shimmering inharmonic vibrato gradually acquires vowels, syllables, and finally clear spoken numbers without any abrupt seam.',
      examples: [
        {
          id: 'm7-three-stage-morph',
          title: 'Three-Stage Morph: Vibrato Gong → Counting Voice',
          summary: 'Build a seamless acoustic bridge from a metallic gong into clear human speech by chaining `formants vocode` with two nested `morph morph 1` passes.',
          legacyOrigin: 'Workshop 1 — Worksheet 8 (ST7)',
          programs: ['pvoc', 'formants', 'morph'],
          sourceAudio: 'gongvib.wav',
          extraSources: ['count.wav'],
          defaultViewMode: 'both',
          spectrogramColorMap: 'viridis',
          code: `const gong = await loadAudio('gongvib.wav');
const count = await loadAudio('count.wav');

const gongAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], gong, { outExt: 'ana' });
const countAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], count, { outExt: 'ana' });

// Stage 1: Half-way bridge — impose the voice's spectral envelope onto the gong
const voc = await cdp.run(
  'formants',
  ['vocode', '/gong.ana', '/count.ana', '/gv.ana', '-f4'],
  { inputs: { '/gong.ana': gongAna.bytes, '/count.ana': countAna.bytes }, outputs: ['/gv.ana'] }
);
const stage1Wav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], voc.outputs['/gv.ana'], { inExt: 'ana' });
output(stage1Wav.bytes, 'Stage 1: Vocoded talking gong (bridge)');

// Stage 2: Morph the vocoded gong into the clear counting voice over 0..8 s (exp 1.5)
// Args: mode=1, as=0, ae=8, fs=0, fe=8, expa=1.5, expf=1.5
const stage2 = await cdp.run(
  'morph',
  ['morph', '1', '/gv.ana', '/count.ana', '/gv2c.ana', '0', '8', '0', '8', '1.5', '1.5'],
  { inputs: { '/gv.ana': voc.outputs['/gv.ana'], '/count.ana': countAna.bytes }, outputs: ['/gv2c.ana'] }
);

// Stage 3: Morph the pure gong (5..10 s, staggered -s5) into the Stage 2 transition
const stage3 = await cdp.run(
  'morph',
  ['morph', '1', '/gong.ana', '/gv2c.ana', '/final.ana', '5', '10', '5', '10', '1', '1', '-s5'],
  { inputs: { '/gong.ana': gongAna.bytes, '/gv2c.ana': stage2.outputs['/gv2c.ana'] }, outputs: ['/final.ana'] }
);
const finalWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], stage3.outputs['/final.ana'], { inExt: 'ana' });
output(finalWav.bytes, 'Stage 3: Full gong -> counting voice morph');

log('Completed 3-stage gong-to-voice morph.');`,
          tryThis: [
            'Offset the amplitude and frequency morph windows in Stage 2 (e.g. `0 6 2 8` instead of `0 8 0 8`) so spectral pitches morph after the amplitudes.',
            'Change Stage 3 stagger `-s5` to `-s3` and window `3 8 3 8` so the voice emerges earlier in the gong’s decay.',
            'Try `-p12` instead of `-f4` in Stage 1 to make the talking-gong bridge more articulate.',
          ],
        },
        {
          id: 'm7-glide-and-xmod',
          title: 'Single-Window Spectral Glide & Time-Domain Cross-Modulation',
          summary: 'Compare a slow, frozen spectral glide (`spec grab` + `morph glide`) against raw time-domain sample multiplication (`modify radical 6` + normalise).',
          legacyOrigin: 'Workshop 1 — Worksheet 8 (ST8) & Worksheet 9 (ST48)',
          programs: ['pvoc', 'spec', 'morph', 'modify'],
          sourceAudio: 'trcdt.wav',
          extraSources: ['frogs3cdt.wav', 'count.wav', 'donkey1g44.wav'],
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'magma',
          code: `// 1. Single-window spectral glide: tractor snapshot (1.0 s) -> frog snapshot (0.05 s)
const tractor = await loadAudio('trcdt.wav');
const frogs = await loadAudio('frogs3cdt.wav');

const trAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], tractor, { outExt: 'ana' });
const frAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], frogs, { outExt: 'ana' });

const trGrab = await cdp.process('spec', ['grab', '$IN', '$OUT', '1.0'], trAna.bytes, { inExt: 'ana', outExt: 'ana' });
const frGrab = await cdp.process('spec', ['grab', '$IN', '$OUT', '0.05'], frAna.bytes, { inExt: 'ana', outExt: 'ana' });

// Glide smoothly between the two frozen spectral windows over 12 seconds
const glideAna = await cdp.run(
  'morph',
  ['glide', '/tg.ana', '/fg.ana', '/glide.ana', '12'],
  { inputs: { '/tg.ana': trGrab.bytes, '/fg.ana': frGrab.bytes }, outputs: ['/glide.ana'] }
);
const glideWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], glideAna.outputs['/glide.ana'], { inExt: 'ana' });
output(glideWav.bytes, '1. morph glide (12 s frozen-window drone)');

// 2. Time-domain cross-modulation: count.wav * donkey1g44.wav, then normalise
const count = await loadAudio('count.wav');
const donkey = await loadAudio('donkey1g44.wav');

const xm = await cdp.run(
  'modify',
  ['radical', '6', '/count.wav', '/donkey.wav', '/xm.wav'],
  { inputs: { '/count.wav': count, '/donkey.wav': donkey }, outputs: ['/xm.wav'] }
);
// Normalise output level (modify loudness Mode 3)
const norm = await cdp.process('modify', ['loudness', '3', '$IN', '$OUT'], xm.outputs['/xm.wav']);
output(norm.bytes, '2. modify radical 6 (voice x donkey cross-mod)');

log('Rendered 12 s spectral glide and normalised cross-modulation.');`,
          tryThis: [
            'Change the `spec grab` sample times (`1.0` and `0.05`) to grab brighter or darker moments from the tractor and frogs.',
            'Extend the `morph glide` duration from `12` to `20` seconds for a slower ambient drone evolution.',
            'Try cross-modulating `gongvib.wav` with `vocalsnd.wav` in Part 2 to hear metallic sidebands modulated by singing.',
          ],
        },
      ],
    },
  ],
};
