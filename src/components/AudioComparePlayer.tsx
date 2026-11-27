import { useEffect, useMemo, useState } from 'react';
import { WaveformSpectrogramPlayer } from '@olilarkin/react-waveform';
import { Columns2, Download, Layers, SlidersHorizontal } from 'lucide-react';
import { decodeWav } from 'cdp-wasm/wav';
import { getAudioUrl, loadAudio } from '../engine/cdp-client';
import type { SnippetOutput } from '../engine/snippet-runner';
import { SOURCE_AUDIO_MAP } from '../data/sources';

export type ViewMode = 'waveform' | 'spectrum' | 'both';
export type ColorMap = 'inferno' | 'magma' | 'viridis' | 'jet' | 'grayscale';

export const STUDIO_WAVEFORM_APPEARANCE = {
  accentColor: '#111111',
  textColor: '#111111',
  mutedTextColor: '#666666',
  faintTextColor: '#999999',
  borderColor: '#dcdcdc',
  backgroundColor: '#fafafa',
  playheadColor: '#111111',
  rangeFillColor: '#111111',
  rangeHandleColor: '#111111',
  spectrogramBackgroundColor: '#111111',
};

interface AudioMeta {
  sampleRate: number;
  numChannels: number;
  durationSec: number;
  bitDepth: number;
  sizeBytes: number;
}

interface AudioComparePlayerProps {
  snippetId: string;
  sourceAudio: string;
  extraSources?: string[];
  outputs: SnippetOutput[];
  defaultViewMode: ViewMode;
  spectrogramColorMap?: ColorMap;
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec)) return '--';
  if (sec < 10) return `${sec.toFixed(2)}s`;
  return `${sec.toFixed(1)}s`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'output';
}

export function AudioComparePlayer({
  snippetId,
  sourceAudio,
  extraSources = [],
  outputs,
  defaultViewMode,
  spectrogramColorMap = 'grayscale',
}: AudioComparePlayerProps) {
  const allSources = useMemo(() => {
    const list = [sourceAudio, ...extraSources].filter(Boolean);
    return Array.from(new Set(list));
  }, [sourceAudio, extraSources]);

  const [activeSourceFile, setActiveSourceFile] = useState(sourceAudio);
  const [activeTab, setActiveTab] = useState<'source' | number>('source');
  const [splitView, setSplitView] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [colorMap, setColorMap] = useState<ColorMap>(spectrogramColorMap);
  const [sourceMeta, setSourceMeta] = useState<AudioMeta | null>(null);

  useEffect(() => {
    setActiveSourceFile(sourceAudio);
  }, [sourceAudio]);

  // Auto-switch to the first processed output whenever new outputs arrive
  useEffect(() => {
    if (outputs.length > 0) {
      setActiveTab(0);
    } else {
      setActiveTab('source');
      setSplitView(false);
    }
  }, [outputs]);

  // Inspect source WAV header metadata lazily for the info strip
  useEffect(() => {
    let cancelled = false;
    loadAudio(activeSourceFile)
      .then((bytes) => {
        if (cancelled) return;
        const dec = decodeWav(bytes);
        setSourceMeta({
          sampleRate: dec.sampleRate,
          numChannels: dec.numChannels,
          durationSec: dec.length / dec.sampleRate,
          bitDepth: dec.bitDepth,
          sizeBytes: bytes.byteLength,
        });
      })
      .catch(() => {
        if (!cancelled) setSourceMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSourceFile]);

  const selectedOutputIndex = typeof activeTab === 'number' && outputs[activeTab] ? activeTab : 0;
  const selectedOutput: SnippetOutput | null = outputs[selectedOutputIndex] ?? null;

  const sourceUrl = getAudioUrl(activeSourceFile);
  const sourceInfo = SOURCE_AUDIO_MAP[activeSourceFile];

  const handleDownload = (out: SnippetOutput) => {
    const url = URL.createObjectURL(out.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snippetId}-${slugify(out.label)}.wav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const renderMetaChips = (meta: AudioMeta | null) => {
    if (!meta) return null;
    return (
      <div className="audio-meta-chips">
        <span>{formatDuration(meta.durationSec)}</span>
        <span>{(meta.sampleRate / 1000).toFixed(1)} kHz</span>
        <span>{meta.numChannels === 1 ? 'Mono' : `${meta.numChannels}ch`}</span>
        <span>{meta.bitDepth}-bit</span>
        <span>{formatSize(meta.sizeBytes)}</span>
      </div>
    );
  };

  const renderSourcePlayer = () => (
    <div className="player-pane">
      <div className="player-pane-header">
        <div className="player-pane-title">
          <span className="pane-badge pane-badge-source">SRC</span>
          {allSources.length > 1 ? (
            <select
              className="source-inline-select"
              value={activeSourceFile}
              onChange={(e) => setActiveSourceFile(e.target.value)}
              aria-label="Select source WAV"
            >
              {allSources.map((file) => (
                <option key={file} value={file}>
                  {file} {SOURCE_AUDIO_MAP[file] ? `— ${SOURCE_AUDIO_MAP[file].label}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <span className="pane-filename">
              {activeSourceFile}
              {sourceInfo ? ` · ${sourceInfo.label}` : ''}
            </span>
          )}
        </div>
        {renderMetaChips(sourceMeta)}
      </div>
      <div className="waveform-host">
        <WaveformSpectrogramPlayer
          key={`src-${activeSourceFile}-${viewMode}-${colorMap}`}
          source={sourceUrl}
          metadata={{
            name: activeSourceFile,
            sizeBytes: sourceMeta?.sizeBytes,
            mimeType: 'audio/wav',
          }}
          defaultViewMode={viewMode}
          waveformDrawingMode="solid"
          spectrogramOptions={{ colorMap }}
          rangeSelection={true}
          loopPlayback={true}
          followPlayback={true}
          appearance={STUDIO_WAVEFORM_APPEARANCE}
        />
      </div>
    </div>
  );

  const renderOutputPlayer = (out: SnippetOutput, idx: number) => (
    <div className="player-pane player-pane-output">
      <div className="player-pane-header">
        <div className="player-pane-title">
          <span className="pane-badge pane-badge-output">OUT {outputs.length > 1 ? idx + 1 : ''}</span>
          <span className="pane-filename">{out.label}</span>
        </div>
        <div className="player-pane-right">
          {renderMetaChips(out)}
          <button
            type="button"
            className="btn-icon-subtle"
            onClick={() => handleDownload(out)}
            title={`Download ${out.label} as WAV`}
          >
            <Download size={14} />
            <span>WAV</span>
          </button>
        </div>
      </div>
      <div className="waveform-host">
        <WaveformSpectrogramPlayer
          key={`out-${snippetId}-${idx}-${out.sizeBytes}-${viewMode}-${colorMap}`}
          source={out.blob}
          metadata={{
            name: `${out.label}.wav`,
            sizeBytes: out.sizeBytes,
            mimeType: 'audio/wav',
          }}
          defaultViewMode={viewMode}
          waveformDrawingMode="solid"
          spectrogramOptions={{ colorMap }}
          rangeSelection={true}
          loopPlayback={true}
          followPlayback={true}
          appearance={STUDIO_WAVEFORM_APPEARANCE}
        />
      </div>
    </div>
  );

  return (
    <div className="audio-compare-player">
      <div className="compare-toolbar">
        <div className="compare-tabs" role="tablist" aria-label="Audio tracks">
          {!splitView && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'source'}
              className={`compare-tab ${activeTab === 'source' ? 'active' : ''}`}
              onClick={() => setActiveTab('source')}
            >
              Source ({activeSourceFile})
            </button>
          )}
          {outputs.map((out, idx) => (
            <button
              key={`${out.label}-${idx}`}
              type="button"
              role="tab"
              aria-selected={splitView ? selectedOutputIndex === idx : activeTab === idx}
              className={`compare-tab compare-tab-output ${
                (splitView ? selectedOutputIndex === idx : activeTab === idx) ? 'active' : ''
              }`}
              onClick={() => setActiveTab(idx)}
            >
              {out.label}
            </button>
          ))}
          {outputs.length === 0 && (
            <span className="compare-hint">Run code to generate &amp; compare processed audio</span>
          )}
        </div>

        <div className="compare-controls">
          {outputs.length > 0 && (
            <button
              type="button"
              className={`ctrl-pill ${splitView ? 'active' : ''}`}
              onClick={() => setSplitView((v) => !v)}
              title="Toggle side-by-side Source vs Output comparison"
            >
              {splitView ? <Columns2 size={13} /> : <Layers size={13} />}
              <span>{splitView ? 'Split' : 'A/B'}</span>
            </button>
          )}

          <div className="segmented-control" role="group" aria-label="Visual display mode">
            {(['waveform', 'spectrum', 'both'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`seg-btn ${viewMode === mode ? 'active' : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'waveform' ? 'Wave' : mode === 'spectrum' ? 'Spec' : 'Both'}
              </button>
            ))}
          </div>

          {viewMode !== 'waveform' && (
            <label className="colormap-select-wrap" title="Spectrogram color map">
              <SlidersHorizontal size={12} />
              <select
                className="colormap-select"
                value={colorMap}
                onChange={(e) => setColorMap(e.target.value as ColorMap)}
                aria-label="Spectrogram color map"
              >
                <option value="grayscale">Grayscale</option>
                <option value="inferno">Inferno</option>
                <option value="magma">Magma</option>
                <option value="viridis">Viridis</option>
                <option value="jet">Jet</option>
              </select>
            </label>
          )}
        </div>
      </div>

      {splitView && selectedOutput ? (
        <div className="compare-split-grid">
          {renderSourcePlayer()}
          {renderOutputPlayer(selectedOutput, selectedOutputIndex)}
        </div>
      ) : activeTab === 'source' || !selectedOutput ? (
        renderSourcePlayer()
      ) : (
        renderOutputPlayer(selectedOutput, selectedOutputIndex)
      )}
    </div>
  );
}
