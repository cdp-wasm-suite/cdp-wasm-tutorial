import { useEffect, useState } from 'react';
import { WaveformSpectrogramPlayer } from '@olilarkin/react-waveform';
import { ArrowLeft, ArrowRight, Volume2 } from 'lucide-react';
import type { TutorialModule } from '../types';
import { SOURCE_AUDIO_MAP } from '../data/sources';
import { getAudioUrl } from '../engine/cdp-client';
import { STUDIO_WAVEFORM_APPEARANCE } from './AudioComparePlayer';
import { SnippetCard } from './SnippetCard';
import { InlineCodeText } from './InlineCodeText';

interface LessonViewProps {
  module: TutorialModule;
  prevModule?: TutorialModule;
  nextModule?: TutorialModule;
  onSelectModule: (moduleId: string) => void;
}

export function LessonView({
  module,
  prevModule,
  nextModule,
  onSelectModule,
}: LessonViewProps) {
  const [previewSource, setPreviewSource] = useState<string | null>(null);

  useEffect(() => {
    setPreviewSource(null);
  }, [module.id]);

  return (
    <div className="lesson-view">
      <header className="lesson-hero">
        <div className="lesson-hero-meta">
          <span className="hero-module-num">Module {String(module.number).padStart(2, '0')}</span>
          <span className="hero-meta-sep">/</span>
          <span className="hero-category-label">{module.category}</span>
        </div>
        <h1 className="lesson-title">{module.title}</h1>
        <p className="lesson-subtitle">{module.subtitle}</p>
        <div className="lesson-overview">
          {module.overview.map((paragraph, idx) => (
            <p key={idx}>
              <InlineCodeText text={paragraph} />
            </p>
          ))}
        </div>
      </header>

      {module.sources.length > 0 && (
        <section className="source-strip" aria-label="Module source audio">
          <div className="source-strip-header">
            <div className="source-strip-heading">
              <span>Module Source Sounds</span>
            </div>
            <span className="source-strip-sub">
              Select a source to audition its waveform and spectrogram
            </span>
          </div>

          <div className="source-chip-grid">
            {module.sources.map((file) => {
              const info = SOURCE_AUDIO_MAP[file];
              const isSelected = previewSource === file;
              return (
                <button
                  key={file}
                  type="button"
                  className={`source-card-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => setPreviewSource(isSelected ? null : file)}
                >
                  <div className="source-card-top">
                    <Volume2 size={13} className="source-icon" />
                    <code className="source-filename">{file}</code>
                  </div>
                  <div className="source-card-label">{info?.label ?? file}</div>
                  {info && <div className="source-card-desc">{info.description}</div>}
                </button>
              );
            })}
          </div>

          {previewSource && (
            <div className="source-preview-drawer">
              <div className="source-preview-bar">
                <span>
                  Auditioning <strong>{previewSource}</strong>
                  {SOURCE_AUDIO_MAP[previewSource] ? ` — ${SOURCE_AUDIO_MAP[previewSource].label}` : ''}
                </span>
                {SOURCE_AUDIO_MAP[previewSource] && (
                  <span className="source-origin-note">{SOURCE_AUDIO_MAP[previewSource].origin}</span>
                )}
              </div>
              <WaveformSpectrogramPlayer
                key={`preview-${previewSource}-${module.visualFocus}`}
                source={getAudioUrl(previewSource)}
                metadata={{ name: previewSource, mimeType: 'audio/wav' }}
                defaultViewMode={module.visualFocus}
                waveformDrawingMode="solid"
                spectrogramOptions={{ colorMap: 'grayscale' }}
                rangeSelection={true}
                loopPlayback={true}
                followPlayback={true}
                appearance={STUDIO_WAVEFORM_APPEARANCE}
              />
            </div>
          )}
        </section>
      )}

      <div className="lesson-sections">
        {module.sections.map((section, sIdx) => (
          <section key={section.id} id={section.id} className="lesson-section">
            <div className="section-heading-row">
              <span className="section-index">
                {module.number}.{sIdx + 1}
              </span>
              <h2 className="section-heading">{section.heading}</h2>
            </div>

            <div className="section-prose">
              {section.prose.map((p, idx) => (
                <p key={idx}>
                  <InlineCodeText text={p} />
                </p>
              ))}
            </div>

            {section.tip && (
              <aside className="studio-tip">
                <div>
                  <strong>Note: </strong>
                  <InlineCodeText text={section.tip} />
                </div>
              </aside>
            )}

            <div className="section-examples">
              {section.examples.map((ex) => (
                <SnippetCard key={ex.id} example={ex} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <nav className="lesson-pager" aria-label="Module navigation">
        {prevModule ? (
          <button
            type="button"
            className="pager-btn pager-prev"
            onClick={() => onSelectModule(prevModule.id)}
          >
            <ArrowLeft size={16} />
            <div>
              <div className="pager-dir">Previous Module</div>
              <div className="pager-title">
                {String(prevModule.number).padStart(2, '0')} · {prevModule.title}
              </div>
            </div>
          </button>
        ) : (
          <div />
        )}

        {nextModule && (
          <button
            type="button"
            className="pager-btn pager-next"
            onClick={() => onSelectModule(nextModule.id)}
          >
            <div>
              <div className="pager-dir">Next Module</div>
              <div className="pager-title">
                {String(nextModule.number).padStart(2, '0')} · {nextModule.title}
              </div>
            </div>
            <ArrowRight size={16} />
          </button>
        )}
      </nav>
    </div>
  );
}
