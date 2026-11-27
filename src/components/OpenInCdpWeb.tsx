import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioUrl } from '../engine/cdp-client';
import cdpWebIcon from '../cdp-web.png';

// Where cdp-web fetches the tutorial sounds from. It runs on https, so it can't
// load from a local dev server: fall back to the published copies there.
const PUBLISHED_AUDIO_BASE = 'https://cdp-wasm-suite.github.io/tutorials/audio/';
const CDP_WEB_HOME = 'https://cdp-web.app/';

function patchAudioUrl(file: string): string {
  if (window.location.protocol === 'https:') return getAudioUrl(file);
  return PUBLISHED_AUDIO_BASE + encodeURIComponent(file.replace(/^\/+/, ''));
}

interface Prepared {
  code: string;
  url: string | null;
  tooltip: string;
}

async function prepare(code: string, title: string, description: string, edited: boolean): Promise<Prepared> {
  try {
    const { buildCdpWebPatch, cdpWebPatchUrl } = await import('../engine/cdp-web-patch');
    const res = await buildCdpWebPatch(code, { title, description, audioUrl: patchAudioUrl });
    const why = res.omitted.map((o) => `“${o.label}”: ${o.reason}`).join('\n');
    if (!res.patch) {
      return { code, url: null, tooltip: `Can't open this in cdp-web.\n${why}` };
    }
    const total = res.outputCount + res.omitted.length;
    const what = edited ? 'your edited code' : 'this example';
    const tooltip = res.omitted.length
      ? `Open ${what} as a patch in cdp-web (${res.outputCount} of ${total} outputs).\nLeft out:\n${why}`
      : `Open ${what} as an editable patch in cdp-web`;
    return { code, url: await cdpWebPatchUrl(res.patch), tooltip };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { code, url: null, tooltip: `Couldn't build a cdp-web patch: ${message}` };
  }
}

interface OpenInCdpWebProps {
  /** The code currently in the editor. */
  code: string;
  /** Code that is safe to translate up front (the shipped example), so the
   *  button can show whether cdp-web can express it before any interaction.
   *  Anything else is translated only on hover/focus/click, so a half-typed
   *  infinite loop can't hang the page while someone edits. */
  trustedCode?: string;
  title: string;
  description?: string;
}

export function OpenInCdpWeb({ code, trustedCode, title, description = '' }: OpenInCdpWebProps) {
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const pending = useRef<{ code: string; promise: Promise<Prepared> } | null>(null);
  const edited = trustedCode === undefined || code !== trustedCode;

  const ensure = useCallback(
    (forCode: string): Promise<Prepared> => {
      if (pending.current?.code === forCode) return pending.current.promise;
      const promise = prepare(forCode, title, description, forCode !== trustedCode).then((p) => {
        if (pending.current?.promise === promise) setPrepared(p);
        return p;
      });
      pending.current = { code: forCode, promise };
      return promise;
    },
    [title, description, trustedCode],
  );

  useEffect(() => {
    if (trustedCode !== undefined && code === trustedCode) void ensure(trustedCode);
  }, [code, trustedCode, ensure]);

  const current = prepared?.code === code ? prepared : null;
  const unsupported = !!current && !current.url;

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (current?.url) return; // the link is ready: let the browser follow it
    e.preventDefault();
    if (unsupported) return;
    // Open the tab now, while the click still counts as a user gesture, then
    // point it at the patch once it's built.
    const tab = window.open('', '_blank');
    const p = await ensure(code);
    if (p.url && tab) {
      tab.opener = null;
      tab.location.href = p.url;
    } else if (p.url) {
      window.location.href = p.url;
    } else {
      tab?.close();
    }
  };

  return (
    <a
      className={`btn-secondary btn-cdp-web${unsupported ? ' is-unavailable' : ''}`}
      href={current?.url ?? CDP_WEB_HOME}
      target="_blank"
      rel="noopener noreferrer"
      title={current?.tooltip ?? `Open ${edited ? 'your edited code' : 'this example'} as a patch in cdp-web`}
      aria-disabled={unsupported || undefined}
      onPointerEnter={() => void ensure(code)}
      onFocus={() => void ensure(code)}
      onClick={handleClick}
    >
      <img src={cdpWebIcon} alt="" width={16} height={16} />
      <span>cdp-web</span>
    </a>
  );
}
