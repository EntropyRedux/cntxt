import React, { useState } from 'react';
import { 
  Calculator, 
  Play, 
  Plus
} from 'lucide-react';
import { FormulaEngine } from '../../services/formulaParser';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';

const FORMULA_EXAMPLES = [
  { category: 'Date & Time', name: 'NOW()', desc: 'Current ISO date & time timestamp', example: '{=NOW()}' },
  { category: 'Date & Time', name: 'TODAY()', desc: 'Today date YYYY-MM-DD', example: '{=TODAY()}' },
  { category: 'Date & Time', name: 'UUID()', desc: 'Generate unique RFC4122 v4 UUID', example: '{=UUID()}' },
  { category: 'Date & Time', name: 'DATE_ADD(days)', desc: 'Add days to current date', example: '{=DATE_ADD(7)}' },

  { category: 'Text & Case', name: 'UPPER(str)', desc: 'Uppercase transformation', example: '{=UPPER("prompt engine")}' },
  { category: 'Text & Case', name: 'KEBAB(str)', desc: 'Kebab-case string formatting', example: '{=KEBAB("API Spec v2")}' },
  { category: 'Text & Case', name: 'CAMEL(str)', desc: 'CamelCase formatting', example: '{=CAMEL("token cost calculator")}' },
  { category: 'Text & Case', name: 'TITLE(str)', desc: 'Title case formatting', example: '{=TITLE("structured writing workspace")}' },

  { category: 'Markdown', name: 'BOLD(str)', desc: 'Wrap in markdown bold **text**', example: '{=BOLD("Critical Alert")}' },
  { category: 'Markdown', name: 'CODE(str)', desc: 'Wrap in markdown inline code', example: '{=CODE("api.generateResponse()")}' },
  { category: 'Markdown', name: 'HEADING(lvl, str)', desc: 'Generate markdown heading level', example: '{=HEADING(2, "Architecture")}' },
  { category: 'Markdown', name: 'LINK(txt, url)', desc: 'Generate markdown link', example: '{=LINK("ContextPad Repo", "https://contextpad.app")}' },

  { category: 'Lines & Lists', name: 'NUMBERLIST(lines)', desc: 'Convert text lines into numbered list', example: '{=NUMBERLIST("Apples\\nOranges\\nBananas")}' },
  { category: 'Lines & Lists', name: 'CHECKLIST(lines)', desc: 'Convert text lines to task checkboxes', example: '{=CHECKLIST("Write tests\\nDeploy preview")}' },
  { category: 'Lines & Lists', name: 'SORT(lines, "ASC")', desc: 'Alphabetically sort multi-line text', example: '{=SORT("Zebra\\nApple\\nMonkey")}' },
  { category: 'Lines & Lists', name: 'UNIQUE(lines)', desc: 'Remove duplicate lines from text', example: '{=UNIQUE("One\\nTwo\\nOne")}' },

  { category: 'Math', name: 'SUM(...nums)', desc: 'Sum numeric list or array', example: '{=SUM(150, 320, 80)}' },
  { category: 'Math', name: 'ROUND(n, decimals)', desc: 'Round number to decimal places', example: '{=ROUND(AVG(12.5, 14.8, 19.2), 2)}' },
  { category: 'Math', name: 'RANDOM(min, max)', desc: 'Generate random integer between bounds', example: '{=RANDOM(1000, 9999)}' },

  { category: 'Document State', name: 'LINECOUNT()', desc: 'Total line count of active document', example: '{=LINECOUNT()}' },
  { category: 'Document State', name: 'WORDCOUNT()', desc: 'Total word count of active document', example: '{=WORDCOUNT()}' },
  { category: 'Document State', name: 'CHARCOUNT()', desc: 'Total character count of active doc', example: '{=CHARCOUNT()}' },

  { category: 'Encode & Hash', name: 'BASE64(str)', desc: 'Base64 encode string', example: '{=BASE64("ContextPad Engine")}' },
  { category: 'Encode & Hash', name: 'BASE64D(str)', desc: 'Base64 decode string', example: '{=BASE64D("Q29udGV4dFBhZA==")}' },
  { category: 'Encode & Hash', name: 'URLENCODE(str)', desc: 'URL encode parameter', example: '{=URLENCODE("hello world & prompt")}' }
];

export const FormulaPlayground: React.FC = () => {
  const [inputExpr, setInputExpr] = useState('{=UPPER("contextpad formula engine")} | {=NOW()}');
  const [result, setResult] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState('All');

  const { tabs, activeTabId, updateTabContent } = useTabStore();
  const { addNotification } = useNotificationStore();

  const activeTab = tabs.find(t => t.id === activeTabId);

  const formulaEngine = new FormulaEngine({
    lineCount: activeTab?.content.split('\n').length || 1,
    charCount: activeTab?.content.length || 0,
    wordCount: (activeTab?.content.trim().match(/\S+/g) || []).length
  });

  const handleEvaluate = () => {
    try {
      const evaluated = formulaEngine.replaceInlineFormulas(inputExpr);
      setResult(evaluated);
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    }
  };

  const handleInsertToDoc = (formulaStr: string) => {
    if (!activeTab) return;
    updateTabContent(activeTab.id, activeTab.content + ' ' + formulaStr);
    addNotification('Formula Inserted', formulaStr, 'success');
  };

  const categories = ['All', 'Date & Time', 'Text & Case', 'Markdown', 'Lines & Lists', 'Math', 'Document State', 'Encode & Hash'];

  const filteredExamples = FORMULA_EXAMPLES.filter(ex => {
    return selectedCat === 'All' || ex.category === selectedCat;
  });

  return (
    <div className="theme-sidebar flex flex-col h-full overflow-y-auto p-3 space-y-3 text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--text-secondary)] text-[11px]">
          <span>Formula Reference</span>
        </div>
      </div>

      {/* Interactive Tester Box */}
      <div className="theme-card p-3 rounded space-y-2.5 shadow-xs">
        <span className="font-bold text-[var(--text-secondary)] text-[10px] block uppercase tracking-wider">
          Formula Scratchpad
        </span>

        <div className="space-y-1.5">
          <input
            type="text"
            value={inputExpr}
            onChange={(e) => setInputExpr(e.target.value)}
            placeholder="Type formula (e.g. {=UPPER('hello')} or {=NOW()})"
            className="w-full h-7 px-2 theme-input rounded text-[var(--status-success)] font-mono text-xs"
          />

          <div className="flex justify-between items-center pt-0.5">
            <button
              type="button"
              onClick={handleEvaluate}
              title="Evaluate Formula"
              aria-label="Evaluate Formula"
              className="w-7 h-7 theme-btn-primary rounded flex items-center justify-center transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => handleInsertToDoc(inputExpr)}
              title="Insert in Editor"
              aria-label="Insert in Editor"
              className="w-7 h-7 bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded flex items-center justify-center transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Output preview */}
        {result && (
          <div className="p-2 bg-[var(--card-secondary-bg)] border border-[var(--border-primary)] rounded font-mono text-[var(--status-success)] text-xs break-all">
            <span className="text-[10px] text-[var(--text-muted)] block mb-0.5">Computed Result:</span>
            {result}
          </div>
        )}
      </div>

      {/* Categories Bar */}
      <div className="space-y-2">
        <span className="font-bold text-[var(--text-secondary)] text-[10px] block uppercase tracking-wider">
          Functions Catalog
        </span>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-2 py-0.5 rounded transition-colors ${
                selectedCat === cat 
                  ? 'bg-[var(--accent-primary)] text-white font-medium' 
                  : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Function Cards */}
        <div className="space-y-1">
          {filteredExamples.map((item, idx) => (
            <div
              key={idx}
              className="theme-card p-2 rounded transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-[var(--status-success)] text-xs">{item.name}</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border border-[var(--border-primary)] rounded font-medium">
                  {item.category}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">{item.desc}</p>
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-primary)] text-[10px]">
                <code className="font-mono text-[var(--text-primary)] bg-[var(--card-secondary-bg)] px-1.5 py-0.5 rounded border border-[var(--border-primary)]">
                  {item.example}
                </code>
                <button
                  type="button"
                  onClick={() => handleInsertToDoc(item.example)}
                  title={`Insert ${item.name} into document`}
                  aria-label={`Insert ${item.name} into document`}
                  className="w-6 h-6 bg-[var(--accent-container)] text-[var(--accent-primary)] rounded flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
