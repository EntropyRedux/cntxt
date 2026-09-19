import React, { useState, useMemo } from 'react';
import { 
  X, 
  Type, 
  Check, 
  Search, 
  RotateCcw, 
  Award,
  Zap
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { CURATED_FONTS, CuratedFont, THEME_DEFAULT_FONTS } from '../../constants/fonts';

interface FontSelectorModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const FontSelectorModal: React.FC<FontSelectorModalProps> = ({ 
  isOpen: propIsOpen, 
  onClose: propOnClose 
}) => {
  const { settings, updateSettings, isFontSelectorOpen, closeFontSelector } = useSettingsStore();
  const isOpen = propIsOpen !== undefined ? propIsOpen : isFontSelectorOpen;
  const onClose = propOnClose || closeFontSelector;

  const [searchQuery, setSearchQuery] = useState('');
  const [customSampleText, setCustomSampleText] = useState('');

  const currentFontFamily = settings.fontFamily;
  const themeDefaultFontFamily = THEME_DEFAULT_FONTS[settings.theme] || "'JetBrains Mono', monospace";

  const filteredFonts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return CURATED_FONTS;
    return CURATED_FONTS.filter(font => {
      return (
        font.name.toLowerCase().includes(q) ||
        font.creator.toLowerCase().includes(q) ||
        font.scientificBasis.toLowerCase().includes(q) ||
        font.researchFocus.toLowerCase().includes(q) ||
        font.badge.toLowerCase().includes(q) ||
        font.popularTools.some(t => t.toLowerCase().includes(q)) ||
        font.keyFeatures.some(f => f.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelectFont = (font: CuratedFont) => {
    updateSettings({ fontFamily: font.fontFamily });
  };

  const handleResetToThemeDefault = () => {
    updateSettings({ fontFamily: themeDefaultFontFamily });
  };

  const isCurrentFont = (font: CuratedFont) => {
    return currentFontFamily === font.fontFamily || 
           currentFontFamily.includes(font.name) ||
           (font.id === 'jetbrains-mono' && currentFontFamily.includes('JetBrains Mono'));
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-100"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        id="font-selector-modal"
        className="theme-modal w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[var(--border-primary)] bg-[var(--sidebar-bg)]"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-[var(--border-primary)] bg-[var(--titlebar-bg)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center font-bold">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[var(--text-primary)] text-base tracking-tight">
                  Editor Typography & Scientific Font Selection
                </h2>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[var(--accent-container)] text-[var(--on-accent-container)] border border-[var(--accent-primary)]/30">
                  Curated Typefaces
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Typefaces curated with peer-reviewed optical ergonomics, character disambiguation, and eye-fatigue research.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Search, Font Size Stepper, Reset */}
        <div className="px-4 py-3 bg-[var(--card-bg)] border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              id="font-search-input"
              name="fontSearch"
              type="text"
              placeholder="Search fonts by name, feature (ligatures, x-height, dyslexia), or research focus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-primary)] bg-[var(--input-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Editor Font Size Quick Tuning */}
          <div className="flex items-center gap-2 bg-[var(--card-secondary-bg)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs shrink-0">
            <span className="text-[var(--text-secondary)] font-medium">Font Size:</span>
            <button
              type="button"
              onClick={() => updateSettings({ fontSize: Math.max(10, settings.fontSize - 1) })}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] font-bold transition-all"
              title="Decrease Font Size"
            >
              -
            </button>
            <span className="font-mono font-bold text-[var(--accent-primary)] min-w-[32px] text-center">
              {settings.fontSize}px
            </span>
            <button
              type="button"
              onClick={() => updateSettings({ fontSize: Math.min(24, settings.fontSize + 1) })}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] font-bold transition-all"
              title="Increase Font Size"
            >
              +
            </button>
          </div>

          {/* Reset to Theme Default Button */}
          <button
            type="button"
            onClick={handleResetToThemeDefault}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] transition-all shrink-0 cursor-pointer"
            title="Reset editor font to matching default for active theme"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Theme Default</span>
          </button>
        </div>

        {/* Font List Scroll Area (Flat List) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredFonts.length === 0 ? (
            <div className="py-12 text-center">
              <Type className="w-10 h-10 mx-auto text-[var(--text-muted)] opacity-40 mb-3" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">No matching fonts found</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Try refining your search keyword.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1.5 text-xs rounded bg-[var(--accent-primary)] text-white font-medium"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredFonts.map((font) => {
              const active = isCurrentFont(font);
              const isThemeDefault = font.fontFamily === themeDefaultFontFamily;
              return (
                <div
                  key={font.id}
                  className={`rounded-xl border transition-all p-4 ${
                    active
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-container)]/25 shadow-md ring-1 ring-[var(--accent-primary)]'
                      : 'border-[var(--border-primary)] bg-[var(--card-bg)] hover:border-[var(--border-accent)] hover:shadow-xs'
                  }`}
                >
                  {/* Top Row: Font Name, Badges & Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className="text-lg font-bold text-[var(--text-primary)]"
                          style={{ fontFamily: font.fontFamily }}
                        >
                          {font.name}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--card-hover-bg)] text-[var(--text-secondary)]">
                          {font.badge}
                        </span>
                        {isThemeDefault && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            Theme Default
                          </span>
                        )}
                        {font.isDefault && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-2">
                        <span>By {font.creator} ({font.year})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {active ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-semibold shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Active in Editor</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectFont(font)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--accent-primary)] text-[var(--text-primary)] hover:text-white border border-[var(--border-primary)] hover:border-[var(--accent-primary)] text-xs font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Apply Font</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Research Focus & Scientific Rationale */}
                  <div className="mt-3 p-3 rounded-lg bg-[var(--sidebar-header-bg)]/80 border border-[var(--border-subtle)] text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--accent-primary)]">
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      <span>Scientific Basis:</span>
                      <span className="font-normal text-[var(--text-secondary)] truncate">
                        {font.researchFocus}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed text-[11.5px]">
                      {font.scientificBasis}
                    </p>
                  </div>

                  {/* Key Features & Popular Tools */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-semibold text-[var(--text-primary)] text-[11px] uppercase tracking-wider block mb-1">
                        Ergonomic Highlights
                      </span>
                      <ul className="space-y-1 text-[var(--text-secondary)] text-[11px]">
                        {font.keyFeatures.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-[var(--status-success)] shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="font-semibold text-[var(--text-primary)] text-[11px] uppercase tracking-wider block mb-1">
                        Industry Adoption & Best For
                      </span>
                      <p className="text-[var(--text-secondary)] text-[11px] mb-1.5">
                        <strong className="text-[var(--text-primary)] font-medium">Ideal For:</strong> {font.idealFor}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {font.popularTools.map((tool, idx) => (
                          <span 
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Live Rendered Typography Preview Box */}
                  <div className="mt-3">
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Live Preview ({settings.fontSize}px)</span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {font.popularTools[0]} default
                      </span>
                    </div>
                    <div 
                      className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--editor-bg)] text-[var(--text-primary)] text-xs overflow-x-auto leading-relaxed shadow-inner"
                      style={{ 
                        fontFamily: font.fontFamily, 
                        fontSize: `${settings.fontSize}px`,
                        lineHeight: 1.6 
                      }}
                    >
                      {customSampleText || font.sampleSnippet}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-[var(--border-primary)] bg-[var(--titlebar-bg)] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-[11px]">
            <Award className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Active Font: <strong className="text-[var(--text-primary)]">{CURATED_FONTS.find(isCurrentFont)?.name || 'Custom Font'}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white font-semibold hover:bg-[var(--accent-hover)] transition-all cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
