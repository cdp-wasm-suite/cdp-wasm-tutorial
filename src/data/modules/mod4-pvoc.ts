import type { TutorialModule } from '../../types';

export const mod4Pvoc: TutorialModule = {
  id: 'mod4-pvoc',
  number: 4,
  title: 'Entering the Spectral Domain (PVOC)',
  subtitle: 'Analysing audio into time-frequency frames with the Phase Vocoder, then blurring, tracing, freezing, accumulating, and stretching spectra.',
  category: 'Spectral (PVOC)',
  visualFocus: 'spectrum',
  overview: [
    'CDP’s Phase Vocoder (pvoc) opens an entirely different sonic universe. Instead of editing raw pressure samples one by one, pvoc anal 1 slices a mono audio signal into overlapping FFT analysis windows (1024 channels by default), storing the exact amplitude and instantaneous frequency of every spectral bin in an .ana analysis file. After transforming that spectrum with dedicated spectral programs, pvoc synth reconstructs a playable WAV file.',
    'Because time and frequency are separated into independent dimensions inside an .ana file, you can average frames across time without losing pitch (blur blur), keep only the 10 loudest partials per window (hilite trace), freeze individual spectral moments indefinitely (focus freeze, hold, step), accumulate decaying glissando trails (focus accu), and stretch speech to 4× or 8× its duration with zero pitch drop (stretch time).',
  ],
  sources: ['count.wav', 'capm.wav', 'flex.wav', 'trcdt.wav', 'capmc.wav'],
  sections: [
    {
      id: 'm4-sec-pvoc-blur',
      heading: 'The Phase Vocoder Pipeline, Blurring & Spectral Chorusing',
      prose: [
        'Every spectral chain in CDP follows the three-stage pattern: pvoc anal 1 (WAV → .ana), one or more spectral processors (.ana → .ana), and pvoc synth (.ana → WAV). Notice that PVOC operates on single-channel (mono) audio—for stereo inputs, wrapping the chain inside cdp.eachChannel() automatically analyses, processes, and recombines left and right channels cleanly.',
        'Our first spectral processor is blur blur, which averages spectral amplitudes and frequencies across N consecutive analysis windows. Averaging 20 windows adds a delicate, glassy sheen while leaving spoken words intelligible; pushing to 70 windows smears consonants and vowels together into a hazy, dreamlike slur. Pairing the same .ana file with blur chorus Mode 5 randomizes partial amplitudes and frequencies frame by frame, turning a single speaker into a shimmering chorus of ghostly voices.',
      ],
      tip: 'Switch the viewer to Spectrogram mode: notice how blur blur horizontally smudges sharp vertical consonant bursts into glowing pastel ribbons, while blur chorus speckles harmonic lines into wide textured bands.',
      examples: [
        {
          id: 'm4-pvoc-blur-chorus',
          title: 'First PVOC Chain: Spectral Blur (20 & 70 Windows) & Chorus',
          summary: 'Analyses count.wav into an .ana spectrum once, then renders subtle 20-window blur, slurred 70-window blur, and shimmering spectral chorus (Mode 5).',
          legacyOrigin: 'Workshop 1 — Worksheet 9 (ST18–ST19, ST29: PVOC, BLUR BLUR & BLUR CHORUS)',
          programs: ['pvoc', 'blur'],
          sourceAudio: 'count.wav',
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'inferno',
          code: `const src = await loadAudio('count.wav');

// 1. Analyse audio into a Phase Vocoder spectral file (.ana)
const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], src, { outExt: 'ana' });

// 2. Spectral blur: average over 20 windows (tinny sheen) vs 70 windows (slurred wash)
const blur20Ana = await cdp.process('blur', ['blur', '$IN', '$OUT', '20'], ana.bytes, {
  inExt: 'ana',
  outExt: 'ana',
});
const blur70Ana = await cdp.process('blur', ['blur', '$IN', '$OUT', '70'], ana.bytes, {
  inExt: 'ana',
  outExt: 'ana',
});

// 3. Spectral chorus (Mode 5): randomize partial amplitudes (100) and frequencies (1.2)
const chorusAna = await cdp.process(
  'blur',
  ['chorus', '5', '$IN', '$OUT', '100', '1.2'],
  ana.bytes,
  { inExt: 'ana', outExt: 'ana' },
);

// 4. Resynthesize all three .ana files back to playable WAVs
const blur20 = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], blur20Ana.bytes, { inExt: 'ana' });
const blur70 = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], blur70Ana.bytes, { inExt: 'ana' });
const chorus = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], chorusAna.bytes, { inExt: 'ana' });

output(blur20.bytes, 'blur blur (20 windows — sheen)');
output(blur70.bytes, 'blur blur (70 windows — slurred)');
output(chorus.bytes, 'blur chorus Mode 5 (flurry of voices)');`,
          tryThis: [
            'Push blur blur up to 200 windows so the entire spoken count melts into a slow, undulating spectral pad.',
            'Increase blur chorus frequency spread from 1.2 to 2.5 for a wild, detuned swarm of synthetic voices.',
            'Try chaining blur20Ana directly into chorusAna before calling pvoc synth.',
          ],
        },
      ],
    },
    {
      id: 'm4-sec-trace-hold',
      heading: 'Spectral Skeletons (hilite trace) & Compressing Holds (focus hold)',
      prose: [
        'A standard 1024-point PVOC frame tracks over 500 frequency channels simultaneously, most of which hold quiet breath noise and room ambience. CDP’s hilite trace Mode 1 discards every channel except the N loudest per window. Retaining just the 10 loudest channels strips a human voice down to a translucent sinusoidal skeleton—still strangely recognizable, yet sparkling like a glass harmonica.',
        'Chaining that skeleton into focus hold freezes selected analysis frames according to a breakpoint table of "time  hold_duration" pairs. Here, fifteen hold points shrink progressively from 2.0 seconds down to 0.1 seconds, creating an accelerating spectral cadence where sparse, bell-like vocal chords step faster and faster toward the end of the phrase.',
      ],
      tip: 'Look at the spectrogram of hilite trace: the noisy background turns pitch black, leaving only a handful of razor-sharp glowing trajectories. After focus hold, those trajectories stretch into long flat horizontal shelves that grow shorter from left to right.',
      examples: [
        {
          id: 'm4-trace-hold',
          title: 'Spectral Trace (10 Loudest Channels) + Accelerating Holds',
          summary: 'Reduces capm.wav to its 10 loudest spectral channels via hilite trace, then sustains 15 progressively shorter spectral snapshots (2.0 s down to 0.1 s) via focus hold.',
          legacyOrigin: 'Workshop 1 — Worksheet 5 (ST3, ST5: HILITE TRACE & FOCUS HOLD)',
          programs: ['pvoc', 'hilite', 'focus'],
          sourceAudio: 'capm.wav',
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'magma',
          code: `const src = await loadAudio('capm.wav');

// 1. Analyse into PVOC spectrum
const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], src, { outExt: 'ana' });

// 2. Keep only the 10 loudest spectral channels per window -> sinusoidal skeleton
const tracedAna = await cdp.process('hilite', ['trace', '1', '$IN', '$OUT', '10'], ana.bytes, {
  inExt: 'ana',
  outExt: 'ana',
});

// 3. Hold 15 spectral moments with compressing durations (2.0 s down to 0.1 s)
const holdTimes = text([
  '0.35  2.0',
  '1.0   1.8',
  '1.5   1.6',
  '2.0   1.4',
  '2.5   1.2',
  '3.0   1.0',
  '3.5   0.9',
  '4.0   0.8',
  '4.5   0.7',
  '5.0   0.6',
  '5.5   0.5',
  '6.0   0.4',
  '6.5   0.3',
  '6.7   0.2',
  '6.9   0.1',
].join('\\n'));

const heldAna = await cdp.process(
  'focus',
  ['hold', '$IN', '$OUT', '/holdtimes.brk'],
  tracedAna.bytes,
  {
    inExt: 'ana',
    outExt: 'ana',
    extraInputs: { '/holdtimes.brk': holdTimes },
  },
);

// 4. Resynthesize both stages so you can compare the skeleton before and after holding
const tracedWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], tracedAna.bytes, { inExt: 'ana' });
const heldWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], heldAna.bytes, { inExt: 'ana' });

output(tracedWav.bytes, 'hilite trace (10 loudest channels)');
output(heldWav.bytes, 'hilite trace -> focus hold (accelerating holds)');`,
          tryThis: [
            'Drop hilite trace from 10 channels down to 3 channels for an ultra-minimal whistling melody extracted from speech.',
            'Reverse the durations in holdTimes (0.1 s up to 2.0 s) so the voice decelerates into massive frozen chords.',
            'Skip hilite trace and feed ana.bytes directly into focus hold to hear full-bandwidth vocal freezes.',
          ],
        },
      ],
    },
    {
      id: 'm4-sec-freeze-step',
      heading: 'Scripted Spectral Freezes & Rhythmic Step-Freezes',
      prose: [
        'Unlike focus hold (which inserts extra time and lengthens the file), focus freeze keeps the original file duration fixed and locks the spectrum over chosen time spans. Its plain-text script lists timestamps in seconds: prefixing a time with "a" freezes that window forward until the next timestamp, while prefixing with "b" freezes backward into the preceding span. Mode 3 freezes both amplitudes and frequencies, turning a gliding flexatone into sculpted metallic plateaus—including a striking 2-second sustained drone from 3.5 to 5.5 seconds.',
        'For strict rhythmic quantization of timbre, focus step freezes the spectrum on a uniform grid. Stepping every 0.25 seconds turns the swooping flexatone into a quirky, stair-stepped melodic sequence; stepping every 0.1 seconds across the idling tractor creates a relentless, mechanical rhythmic pulse.',
      ],
      examples: [
        {
          id: 'm4-freeze-step',
          title: 'Scripted Freeze (focus freeze) & Periodic Step-Freeze (focus step)',
          summary: 'Applies forward/backward scripted freezes (including a 2-second hold) and 0.25 s step-freezes to flex.wav, plus a mechanical 0.1 s step-freeze on trcdt.wav.',
          legacyOrigin: 'Workshop 1 — Worksheet 5 (ST2, ST5–ST6: FOCUS FREEZE & FOCUS STEP)',
          programs: ['pvoc', 'focus'],
          sourceAudio: 'flex.wav',
          extraSources: ['trcdt.wav'],
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'inferno',
          code: `const flex = await loadAudio('flex.wav');
const tractor = await loadAudio('trcdt.wav');

const flexAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], flex, { outExt: 'ana' });
const tracAna = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], tractor, { outExt: 'ana' });

// 1. Scripted freeze (Mode 3 = amps + freqs): 'a' freezes forward, 'b' freezes backward
//    Notice the 2-second hold from a3.5 to 5.5
const freezeScript = text([
  '0.0',
  'a0.5',
  '1.0',
  'a1.2',
  '1.5',
  'a1.75',
  '2.0',
  'a2.25',
  '2.5',
  'b3.0',
  'a3.5',
  '5.5',
  'a5.6',
  '6.6',
].join('\\n'));

const frozenAna = await cdp.process(
  'focus',
  ['freeze', '3', '$IN', '$OUT', '/flexfrz2.txt'],
  flexAna.bytes,
  {
    inExt: 'ana',
    outExt: 'ana',
    extraInputs: { '/flexfrz2.txt': freezeScript },
  },
);

// 2. Step-freeze flexatone every 0.25 s -> tuneful staircase of held tones
const flexStepAna = await cdp.process('focus', ['step', '$IN', '$OUT', '0.25'], flexAna.bytes, {
  inExt: 'ana',
  outExt: 'ana',
});

// 3. Step-freeze tractor every 0.1 s -> mechanical rhythmic churning
const tracStepAna = await cdp.process('focus', ['step', '$IN', '$OUT', '0.1'], tracAna.bytes, {
  inExt: 'ana',
  outExt: 'ana',
});

const frozenWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], frozenAna.bytes, { inExt: 'ana' });
const flexStepWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], flexStepAna.bytes, { inExt: 'ana' });
const tracStepWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], tracStepAna.bytes, { inExt: 'ana' });

output(frozenWav.bytes, 'Flexatone: focus freeze Mode 3 (2 s hold at 3.5-5.5 s)');
output(flexStepWav.bytes, 'Flexatone: focus step (0.25 s grid)');
output(tracStepWav.bytes, 'Tractor: focus step (0.1 s mechanical pulse)');`,
          tryThis: [
            'In focus freeze, switch Mode 3 (amps & freqs) to Mode 1 (amplitudes only) or Mode 2 (frequencies only) to hear pitch move over frozen loudness or vice versa.',
            'Change the flexatone step size from 0.25 s to 0.5 s for slow, sustained harmonic blocks.',
            'Shift the long freeze anchor from a3.5 to a2.1 to capture a completely different resonant timbre of the flexatone.',
          ],
        },
      ],
    },
    {
      id: 'm4-sec-accu',
      heading: 'Spectral Accumulation & Internal Glissandi (focus accu)',
      prose: [
        'Imagine a piano sustain pedal that operates independently on every single frequency bin in an FFT spectrum. That is focus accu: whenever energy enters a channel, that partial stays sustained until an even louder event arrives in the same channel. Every syllable leaves behind a luminous resonant chord hanging in mid-air.',
        'Two optional flags turn accumulation into an expressive compositional tool: -d sets the per-second amplitude decay rate (values near 0.01 decay very slowly for lush, shimmering trails; values near 0.25 fade faster), and -g introduces an internal glissando in octaves per second—positive values make sustained partials drift gently skyward, while negative values make every lingering harmonic cascade downward like melting glass.',
      ],
      tip: 'Watch the spectrogram closely on the second output (-g-0.15): every bright vocal formant sprouts curved diagonal trails drifting downward through the spectrum as the voice continues speaking on top.',
      examples: [
        {
          id: 'm4-focus-accu',
          title: 'Spectral Accumulation: Slow Upward Glow vs Cascading Downward Trails',
          summary: 'Sustains spectral partials of capm.wav via focus accu, contrasting a delicate, slowly rising shimmer (-d0.01 -g0.01) against faster downward-gliding harmonic trails (-d0.2 -g-0.15).',
          legacyOrigin: 'Workshop 1 — Worksheet 1 (ST15: FOCUS ACCU)',
          programs: ['pvoc', 'focus'],
          sourceAudio: 'capm.wav',
          defaultViewMode: 'spectrum',
          spectrogramColorMap: 'viridis',
          code: `const src = await loadAudio('capm.wav');

// 1. Analyse voice into PVOC spectrum
const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], src, { outExt: 'ana' });

// 2. Classic subtle shimmer: slow decay (-d0.01) and gentle upward glissando (-g0.01)
const subtleAna = await cdp.process(
  'focus',
  ['accu', '$IN', '$OUT', '-d0.01', '-g0.01'],
  ana.bytes,
  { inExt: 'ana', outExt: 'ana' },
);

// 3. Dramatic cascading trails: faster decay (-d0.2) and downward gliss (-g-0.15 oct/sec)
const cascadeAna = await cdp.process(
  'focus',
  ['accu', '$IN', '$OUT', '-d0.2', '-g-0.15'],
  ana.bytes,
  { inExt: 'ana', outExt: 'ana' },
);

const subtleWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], subtleAna.bytes, { inExt: 'ana' });
const cascadeWav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], cascadeAna.bytes, { inExt: 'ana' });

output(subtleWav.bytes, 'focus accu (-d0.01, -g0.01 — slow shimmer)');
output(cascadeWav.bytes, 'focus accu (-d0.2, -g-0.15 — downward cascades)');`,
          tryThis: [
            'Remove the -g flag completely ("accu", "$IN", "$OUT", "-d0.05") for a pure, motionless spectral sustain pedal.',
            'Try a positive glissando of -g0.25 with -d0.15 so every consonant shoots rising sci-fi laser trails upward.',
            'Swap capm.wav for bellsnd.wav or marimba.wav to hear percussive strikes bloom into evolving ambient drones.',
          ],
        },
      ],
    },
    {
      id: 'm4-sec-stretch',
      heading: 'Extreme Spectral Time-Stretching (stretch time)',
      prose: [
        'In Module 1, slowing a sound down in the time domain with modify speed dropped its pitch an octave for every doubling of duration. In the spectral domain, stretch time Mode 1 interpolates new analysis frames between existing ones while keeping every bin’s frequency intact—elongating time completely independently of pitch.',
        'Starting from the crisp 1.9-second spoken phrase capmc.wav ("the extravehicular momentum shields"), stretching by ×2 turns brisk speech into a relaxed drawl (3.8 s). Chaining a second ×2 pass stretches the .ana file to ×4 (7.6 s): vowels expand into sustained harmonic chords, while transient consonants ("s", "k", "sh") bloom into cavernous, breathy noise landscapes. Classic CDP practice chains successive ×2 passes directly in the spectral domain—avoiding repeated analysis/resynthesis losses—all the way to ×16, ×32, or ×64.',
      ],
      tip: 'Compare the spectrogram of ×2 and ×4: the vertical frequency coordinates of the vocal formants remain completely unchanged even as the horizontal time axis doubles and quadruples.',
      examples: [
        {
          id: 'm4-stretch-time',
          title: 'Chained Spectral Time-Stretching (×2 and ×4 on Speech)',
          summary: 'Analyses the 1.9 s phrase capmc.wav once and chains stretch time Mode 1 twice in the spectral domain to produce clean ×2 (3.8 s) and ×4 (7.6 s) pitch-preserved stretches.',
          legacyOrigin: 'Workshop 1 — Worksheet 5 (ST6, A87–A88: STRETCH TIME ×2 & ×4)',
          programs: ['pvoc', 'stretch'],
          sourceAudio: 'capmc.wav',
          defaultViewMode: 'both',
          spectrogramColorMap: 'inferno',
          code: `const src = await loadAudio('capmc.wav');

// 1. Analyse the 1.9 s phrase into a PVOC spectrum
const ana = await cdp.process('pvoc', ['anal', '1', '$IN', '$OUT'], src, { outExt: 'ana' });

// 2. First pass: stretch time Mode 1 by factor 2 -> ~3.8 s (pitch unchanged)
const x2Ana = await cdp.process('stretch', ['time', '1', '$IN', '$OUT', '2'], ana.bytes, {
  inExt: 'ana',
  outExt: 'ana',
});

// 3. Second pass chained directly on the .ana spectrum: 2 x 2 = 4x -> ~7.6 s
const x4Ana = await cdp.process('stretch', ['time', '1', '$IN', '$OUT', '2'], x2Ana.bytes, {
  inExt: 'ana',
  outExt: 'ana',
});

// 4. Resynthesize both stretched spectra to WAV
const x2Wav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], x2Ana.bytes, { inExt: 'ana' });
const x4Wav = await cdp.process('pvoc', ['synth', '$IN', '$OUT'], x4Ana.bytes, { inExt: 'ana' });

output(x2Wav.bytes, 'stretch time x2 (3.8 s)');
output(x4Wav.bytes, 'stretch time x4 chained (7.6 s)');`,
          tryThis: [
            'Chain one more pass (stretch time 1 with factor 2 on x4Ana.bytes) to hear ×8 stretching turn consonants into sprawling soundscapes.',
            'Try a factor of 0.5 (compression) to double speaking speed while keeping the speaker’s natural vocal pitch.',
            'Pass a breakpoint file instead of "2" (for example "0.0 1.0", "1.0 6.0", "1.9 1.0") to stretch only the middle word in slow motion.',
          ],
        },
      ],
    },
  ],
};
