export interface SourceAudioInfo {
  file: string;
  label: string;
  description: string;
  origin: string;
}

export interface SnippetExample {
  id: string;
  title: string;
  summary: string;
  legacyOrigin: string;
  programs: string[];
  sourceAudio: string;
  extraSources?: string[];
  defaultViewMode: 'waveform' | 'spectrum' | 'both';
  spectrogramColorMap?: 'inferno' | 'magma' | 'viridis' | 'jet' | 'grayscale';
  code: string;
  tryThis: string[];
}

export interface LessonSection {
  id: string;
  heading: string;
  prose: string[];
  tip?: string;
  examples: SnippetExample[];
}

export interface TutorialModule {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  category: 'Time Domain' | 'Spectral (PVOC)' | 'Composition & Synthesis';
  visualFocus: 'waveform' | 'spectrum' | 'both';
  overview: string[];
  sources: string[];
  sections: LessonSection[];
}
