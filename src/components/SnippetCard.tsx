import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  RotateCcw,
  Terminal,
} from 'lucide-react';
import type { SnippetExample } from '../types';
import type { StepTelemetry } from '../engine/cdp-client';
import { runSnippet, type SnippetRunResult } from '../engine/snippet-runner';
import { CodeEditor } from './CodeEditor';
import { AudioComparePlayer } from './AudioComparePlayer';
import { InlineCodeText } from './InlineCodeText';
import { OpenInCdpWeb } from './OpenInCdpWeb';

interface SnippetCardProps {
  example: SnippetExample;
}

export function SnippetCard({ example }: SnippetCardProps) {
  const [code, setCode] = useState(example.code);
  const [running, setRunning] = useState(false);
  const [liveStep, setLiveStep] = useState<StepTelemetry | null>(null);
  const [result, setResult] = useState<SnippetRunResult | null>(null);
  const [showConsole, setShowConsole] = useState(false);

  // Reset editor and result when switching to a different example
  useEffect(() => {
    setCode(example.code);
    setResult(null);
    setLiveStep(null);
    setShowConsole(false);
  }, [example.id, example.code]);

  const isDirty = code !== example.code;

  const handleRun = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setLiveStep(null);
    try {
      const res = await runSnippet(code, (step) => {
        setLiveStep(step);
      });
      setResult(res);
      if (res.error || (res.outputs.length === 0 && res.logs.length > 0)) {
        setShowConsole(true);
      }
    } finally {
      setRunning(false);
      setLiveStep(null);
    }
  }, [code, running]);

  const handleReset = () => {
    setCode(example.code);
  };

  const cachedCount = result ? result.steps.filter((s) => s.cacheHit).length : 0;

  return (
    <article className="snippet-card" id={example.id}>
      <header className="snippet-header">
        <div className="snippet-title-row">
          <h4 className="snippet-title">{example.title}</h4>
          <span className="legacy-badge">{example.legacyOrigin}</span>
        </div>
        <p className="snippet-summary">
          <InlineCodeText text={example.summary} />
        </p>
        <div className="program-pills">
          {example.programs.map((prog) => (
            <span key={prog} className="program-pill">
              {prog}
            </span>
          ))}
        </div>
      </header>

      <div className="snippet-editor-section">
        <div className="editor-toolbar">
          <div className="editor-toolbar-left">
            <span className="editor-lang-tag">JS · cdp-wasm</span>
            {isDirty && <span className="dirty-dot" title="Edited from original">modified</span>}
            {running && liveStep && (
              <span className="live-step-status">
                <Loader2 size={12} className="spin" />
                <code>{liveStep.program}</code>
              </span>
            )}
            {!running && result && !result.error && (
              <span className="run-telemetry">
                <Check size={13} className="telemetry-ok" />
                <span>
                  {result.steps.length} {result.steps.length === 1 ? 'step' : 'steps'} ·{' '}
                  {Math.round(result.totalDurationMs)} ms
                </span>
                {cachedCount > 0 && (
                  <span className="cache-hit-badge">{cachedCount} cached</span>
                )}
              </span>
            )}
          </div>

          <div className="editor-toolbar-actions">
            <OpenInCdpWeb
              code={code}
              trustedCode={example.code}
              title={example.title}
              description={example.summary}
            />
            {isDirty && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleReset}
                disabled={running}
                title="Reset snippet to original code"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              className="btn-run"
              onClick={handleRun}
              disabled={running}
              title="Run CDP snippet (Ctrl+Enter / Cmd+Enter)"
            >
              {running ? <Loader2 size={14} className="spin" /> : <Play size={14} fill="currentColor" />}
              <span>{running ? 'Processing…' : 'Run'}</span>
              <kbd className="kbd-hint">⌘↵</kbd>
            </button>
          </div>
        </div>

        <CodeEditor value={code} onChange={setCode} onRun={handleRun} />
      </div>

      {example.tryThis.length > 0 && (
        <div className="try-this-box">
          <div className="try-this-label">Try this</div>
          <ul className="try-this-list">
            {example.tryThis.map((item, idx) => (
              <li key={idx}>
                <InlineCodeText text={item} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.error && (
        <div className="snippet-error-box" role="alert">
          <div className="snippet-error-title">
            <AlertCircle size={14} />
            <span>Execution Error</span>
          </div>
          <pre className="snippet-error-pre">{result.error}</pre>
        </div>
      )}

      <AudioComparePlayer
        snippetId={example.id}
        sourceAudio={example.sourceAudio}
        extraSources={example.extraSources}
        outputs={result?.outputs ?? []}
        defaultViewMode={example.defaultViewMode}
      />

      {result && (result.steps.length > 0 || result.logs.length > 0) && (
        <div className="console-drawer">
          <button
            type="button"
            className="console-toggle"
            onClick={() => setShowConsole((s) => !s)}
            aria-expanded={showConsole}
          >
            {showConsole ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Terminal size={13} />
            <span>
              CDP Commands ({result.steps.length})
              {result.logs.length > 0 ? ` & Console (${result.logs.length})` : ''}
            </span>
          </button>

          {showConsole && (
            <div className="console-body">
              {result.steps.length > 0 && (
                <div className="console-block">
                  <div className="console-block-heading">Executed CDP Pipeline</div>
                  <div className="cdp-command-list">
                    {result.steps.map((step, i) => (
                      <div key={i} className="cdp-command-item">
                        <div className="cdp-command-line">
                          <span className="cmd-index">{i + 1}</span>
                          <code className="cmd-text">$ {step.command}</code>
                          <span className="cmd-timing">
                            {step.cacheHit ? (
                              <span className="cache-hit-badge">cached</span>
                            ) : (
                              `${Math.round(step.durationMs)} ms`
                            )}
                          </span>
                        </div>
                        {(step.stdout.trim() || step.stderr.trim()) && (
                          <pre className="cmd-stdio">
                            {[step.stdout.trim(), step.stderr.trim()].filter(Boolean).join('\n')}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.logs.length > 0 && (
                <div className="console-block">
                  <div className="console-block-heading">Snippet Console Output</div>
                  <pre className="console-log-pre">{result.logs.join('\n')}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
