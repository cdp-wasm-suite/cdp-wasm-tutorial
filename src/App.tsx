import { useEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import { ALL_MODULES } from './data/modules';
import { clearCDPCache } from './engine/cdp-client';
import { Sidebar } from './components/Sidebar';
import { LessonView } from './components/LessonView';
import { PlaygroundView } from './components/PlaygroundView';

type ActiveView =
  | { kind: 'module'; moduleId: string }
  | { kind: 'playground' };

function parseHashToView(hash: string): ActiveView {
  const clean = hash.replace(/^#/, '').trim();
  if (clean === 'playground') return { kind: 'playground' };
  const found = ALL_MODULES.find((m) => m.id === clean);
  if (found) return { kind: 'module', moduleId: found.id };
  if (ALL_MODULES.length > 0) {
    return { kind: 'module', moduleId: ALL_MODULES[0].id };
  }
  return { kind: 'playground' };
}

export function App() {
  const [activeView, setActiveView] = useState<ActiveView>(() =>
    parseHashToView(window.location.hash)
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const onHashChange = () => {
      setActiveView(parseHashToView(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const selectModule = (moduleId: string) => {
    setActiveView({ kind: 'module', moduleId });
    window.history.replaceState(null, '', `#${moduleId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectPlayground = () => {
    setActiveView({ kind: 'playground' });
    window.history.replaceState(null, '', '#playground');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearCache = async () => {
    await clearCDPCache();
    setToast('Cleared CDP-WASM step cache');
    setTimeout(() => setToast(null), 2600);
  };

  const { activeModule, prevModule, nextModule } = useMemo(() => {
    if (activeView.kind !== 'module') {
      return { activeModule: undefined, prevModule: undefined, nextModule: undefined };
    }
    const idx = ALL_MODULES.findIndex((m) => m.id === activeView.moduleId);
    if (idx < 0) {
      return { activeModule: ALL_MODULES[0], prevModule: undefined, nextModule: ALL_MODULES[1] };
    }
    return {
      activeModule: ALL_MODULES[idx],
      prevModule: idx > 0 ? ALL_MODULES[idx - 1] : undefined,
      nextModule: idx < ALL_MODULES.length - 1 ? ALL_MODULES[idx + 1] : undefined,
    };
  }, [activeView]);

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <div className="mobile-topbar-title">
          {activeView.kind === 'playground'
            ? 'Free Playground'
            : activeModule
            ? `${String(activeModule.number).padStart(2, '0')} · ${activeModule.title}`
            : 'CDP·WASM Studio'}
        </div>
      </header>

      <Sidebar
        modules={ALL_MODULES}
        activeView={activeView}
        onSelectModule={selectModule}
        onSelectPlayground={selectPlayground}
        onClearCache={handleClearCache}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <main className="main-content">
        <div className="content-container">
          {activeView.kind === 'playground' || !activeModule ? (
            <PlaygroundView />
          ) : (
            <LessonView
              module={activeModule}
              prevModule={prevModule}
              nextModule={nextModule}
              onSelectModule={selectModule}
            />
          )}
        </div>
      </main>

      {toast && (
        <div className="studio-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
