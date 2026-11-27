import type { SourceAudioInfo } from '../types';

export const SOURCE_AUDIO_LIST: SourceAudioInfo[] = [
  {
    file: 'count.wav',
    label: 'Counting Voice',
    description: 'Spoken counting sequence ("one, two, three...") with clear syllables, transients, and vocal formants (8.07s, 44.1 kHz mono).',
    origin: 'CDP Workshop 1 — Worksheet 9',
  },
  {
    file: 'capm.wav',
    label: 'Male Voice ("Captain")',
    description: 'Sustained spoken and breathy male voice phrase, ideal for speed curves, phasing, and spectral formants (7.20s, 44.1 kHz mono).',
    origin: 'CDP Workshop 1 — Worksheet 1',
  },
  {
    file: 'capmc.wav',
    label: 'Short Voice Phrase',
    description: 'Compact vocal excerpt tailored for extreme spectral time-stretching and phase vocoder analysis (1.90s, 44.1 kHz mono).',
    origin: 'CDP Workshop 1 — Worksheet 5',
  },
  {
    file: 'trcdt.wav',
    label: 'Tractor Engine',
    description: 'Broadband, rhythmically chugging tractor motor — an ideal noise-rich carrier for resonant filter banks and vocoding (10.00s, 44.1 kHz mono).',
    origin: 'CDP Workshop 1 — Worksheet 2',
  },
  {
    file: 'flex.wav',
    label: 'Flexatone',
    description: 'Bending metallic percussion pitch glides, rich in wavecycles for distortion, granulation, and spectral freeze (6.60s, 44.1 kHz mono).',
    origin: 'CDP Workshop 1 — Worksheet 3',
  },
  {
    file: 'vocalsnd.wav',
    label: 'Sung Vocal Contour',
    description: 'Expressive pitched vocal phrase used to study formant preservation, pitch-trace extraction, and cross-pitching (4.93s, 44.1 kHz mono).',
    origin: 'CDP Workshop 3 — Transposition & Shifting',
  },
  {
    file: 'drumsnd.wav',
    label: 'Percussion Groove',
    description: 'Crisp drum pattern for comparing time-domain vs. spectral transposition and inharmonic frequency shifting (5.47s, 44.1 kHz mono).',
    origin: 'CDP Workshop 3 — Transposition & Shifting',
  },
  {
    file: 'hornsnd.wav',
    label: 'Brass Horn',
    description: 'Warm, harmonically dense horn tone suited for spectral transposition and pitch-contour sculpting (5.39s, 44.1 kHz mono).',
    origin: 'CDP Workshop 3 — Transposition & Shifting',
  },
  {
    file: 'bellsnd.wav',
    label: 'Inharmonic Bell',
    description: 'Resonant struck bell with shimmering overtones — classic target for vocal cross-pitching and spectral tuning (4.90s, 44.1 kHz mono).',
    origin: 'CDP Workshop 3 — Transposition & Shifting',
  },
  {
    file: 'frogs3cdt.wav',
    label: 'Chorus of Frogs',
    description: 'Rhythmic pulsed frog calls with strong amplitude modulation, perfect for envelope transfer and cross-synthesis (12.60s, 44.1 kHz mono).',
    origin: 'CDP Workshop 1 — Worksheet 7',
  },
  {
    file: 'gongvib.wav',
    label: 'Vibrating Gong',
    description: 'Long, shimmering metallic decay used as the spectral anchor for multi-stage voice morphing (12.60s, 44.1 kHz mono).',
    origin: 'CDP Workshop 1 — Worksheet 8',
  },
  {
    file: 'donkey1g44.wav',
    label: 'Donkey Bray',
    description: 'Dramatic harmonic vocalization with sweeping formants for cross-modulation and hybrid transformations (10.03s, 44.1 kHz mono).',
    origin: 'CDP Workshop 1 — Worksheet 9',
  },
  {
    file: 'marimba.wav',
    label: 'Marimba Note',
    description: 'Single woody pitched mallet hit — the quintessential building block for TEXTURE clouds and melodic motifs (1.00s, 44.1 kHz mono).',
    origin: 'CDP Workshop 2 — Composing with TEXTURE',
  },
  {
    file: 'gtrcdt.wav',
    label: 'Plucked Guitar',
    description: 'Clean acoustic guitar pluck with sharp attack and harmonic decay for timed motifs and harmonic fields (2.10s, 44.1 kHz mono).',
    origin: 'CDP Workshop 2 — Composing with TEXTURE',
  },
  {
    file: 'cymcdt.wav',
    label: 'Suspended Cymbal',
    description: 'Shimmering metallic cymbal wash that blooms into lush harmonic clouds under TEXTURE and spectral filtering (3.80s, 44.1 kHz mono).',
    origin: 'CDP Workshop 1 — Worksheet 6',
  },
  {
    file: 'dingcdt.wav',
    label: 'Resonant Lid Ping',
    description: 'Bright metallic ping with ringing partials for textural scatter, ornaments, and spectral layering (4.15s, 44.1 kHz mono).',
    origin: 'CDP Workshop 1 — Worksheet 6',
  },
];

export const SOURCE_AUDIO_MAP: Record<string, SourceAudioInfo> = Object.fromEntries(
  SOURCE_AUDIO_LIST.map((s) => [s.file, s])
);
