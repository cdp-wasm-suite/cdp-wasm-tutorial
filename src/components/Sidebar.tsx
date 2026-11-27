import { Trash2, X } from 'lucide-react';
import type { TutorialModule } from '../types';

interface SidebarProps {
  modules: TutorialModule[];
  activeView: { kind: 'module'; moduleId: string } | { kind: 'playground' };
  onSelectModule: (moduleId: string) => void;
  onSelectPlayground: () => void;
  onClearCache: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const CATEGORIES: TutorialModule['category'][] = [
  'Time Domain',
  'Spectral (PVOC)',
  'Composition & Synthesis',
];

export function Sidebar({
  modules,
  activeView,
  onSelectModule,
  onSelectPlayground,
  onClearCache,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleJumpSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Tutorial navigation">
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-copy">
              <div className="brand-title">CDP-WASM</div>
              <div className="brand-subtitle">Interactive Tutorials</div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close-mobile"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-scroll">
          <div className="nav-section nav-section-top">
            <button
              type="button"
              className={`nav-playground-btn ${activeView.kind === 'playground' ? 'active' : ''}`}
              onClick={() => {
                onSelectPlayground();
                onCloseMobile();
              }}
            >
              <span>Free Playground</span>
            </button>
          </div>

          {CATEGORIES.map((category) => {
            const group = modules.filter((m) => m.category === category);
            if (group.length === 0) return null;
            return (
              <div key={category} className="nav-category">
                <div className="nav-category-label">{category}</div>
                <ul className="nav-module-list">
                  {group.map((mod) => {
                    const isActive =
                      activeView.kind === 'module' && activeView.moduleId === mod.id;
                    return (
                      <li key={mod.id} className="nav-module-item">
                        <button
                          type="button"
                          className={`nav-module-btn ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            onSelectModule(mod.id);
                            onCloseMobile();
                          }}
                        >
                          <span className="nav-module-num">
                            {String(mod.number).padStart(2, '0')}
                          </span>
                          <span className="nav-module-title">{mod.title}</span>
                        </button>

                        {isActive && mod.sections.length > 0 && (
                          <ul className="nav-section-jump">
                            {mod.sections.map((sec) => (
                              <li key={sec.id}>
                                <button
                                  type="button"
                                  className="nav-jump-btn"
                                  onClick={() => handleJumpSection(sec.id)}
                                >
                                  {sec.heading}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <button
            type="button"
            className="btn-clear-cache"
            onClick={onClearCache}
            title="Clear cached PVOC analysis & CDP step outputs in worker memory"
          >
            <Trash2 size={13} />
            <span>Clear WASM Cache</span>
          </button>
          <div className="sidebar-engine-note">215 CDP programs · local WebAssembly</div>
        </div>
      </aside>
    </>
  );
}
