import React from 'react';
import {
  FileText,
  MessageSquare,
  Table,
  CheckSquare,
  GitFork,
  Code,
  ClipboardCheck,
  ArrowRightLeft,
  Boxes,
} from 'lucide-react';
import { CntxtBlockArchetype } from '../../../contracts/data_shapes';
import { ARCHETYPES, BLOCK_PRESET_DEFINITIONS } from '../../services/editor/blockPresetCatalog';

interface ArchetypePickerProps {
  selectedArchetype: CntxtBlockArchetype;
  selectedPresetId: string;
  onSelectArchetype: (archetype: CntxtBlockArchetype) => void;
  onSelectPreset: (presetId: string) => void;
}

const getArchetypeIcon = (id: CntxtBlockArchetype) => {
  switch (id) {
    case 'deliverable':
      return <FileText className="w-4 h-4 shrink-0" />;
    case 'conversation':
      return <MessageSquare className="w-4 h-4 shrink-0" />;
    case 'table':
      return <Table className="w-4 h-4 shrink-0" />;
    case 'audit':
      return <CheckSquare className="w-4 h-4 shrink-0" />;
    case 'diagram':
      return <GitFork className="w-4 h-4 shrink-0" />;
    case 'code':
      return <Code className="w-4 h-4 shrink-0" />;
    default:
      return <Boxes className="w-4 h-4 shrink-0" />;
  }
};

const getPresetIcon = (iconName: string) => {
  switch (iconName) {
    case 'FileText':
      return <FileText className="w-3.5 h-3.5 shrink-0" />;
    case 'ClipboardCheck':
      return <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />;
    case 'MessageSquare':
      return <MessageSquare className="w-3.5 h-3.5 shrink-0" />;
    case 'Table':
      return <Table className="w-3.5 h-3.5 shrink-0" />;
    case 'CheckSquare':
      return <CheckSquare className="w-3.5 h-3.5 shrink-0" />;
    case 'GitFork':
      return <GitFork className="w-3.5 h-3.5 shrink-0" />;
    case 'ArrowRightLeft':
      return <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />;
    default:
      return <Code className="w-3.5 h-3.5 shrink-0" />;
  }
};

export const ArchetypePicker: React.FC<ArchetypePickerProps> = ({
  selectedArchetype,
  selectedPresetId,
  onSelectArchetype,
  onSelectPreset,
}) => {
  const matchingPresets = BLOCK_PRESET_DEFINITIONS.filter((p) => p.archetype === selectedArchetype);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase block mb-1.5">
          Block Archetype
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {ARCHETYPES.map((arch) => {
            const isSelected = arch.id === selectedArchetype;
            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => onSelectArchetype(arch.id)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border-[var(--accent-primary)] shadow-xs'
                    : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--card-hover-bg)] hover:border-[var(--border-primary)]'
                }`}
                title={arch.description}
                aria-pressed={isSelected}
              >
                <span className={isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}>
                  {getArchetypeIcon(arch.id)}
                </span>
                <span className="truncate">{arch.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {matchingPresets.length > 1 && (
        <div>
          <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase block mb-1.5">
            Starter Preset
          </label>
          <div className="flex flex-wrap gap-1.5">
            {matchingPresets.map((preset) => {
              const isSelected = preset.id === selectedPresetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-primary)] text-[var(--accent-foreground,white)] border-[var(--accent-primary)] shadow-xs'
                      : 'bg-[var(--sidebar-bg)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border-primary)]'
                  }`}
                  title={preset.description}
                >
                  {getPresetIcon(preset.icon)}
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
