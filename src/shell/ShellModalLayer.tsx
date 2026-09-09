import React from 'react';
import { CommandPalette } from '../components/Modals/CommandPalette';
import { VariableFillerModal } from '../components/Modals/VariableFillerModal';
import { ActionEditorModal } from '../components/Modals/ActionEditorModal';
import { ShortcutsModal } from '../components/Modals/ShortcutsModal';

export interface ShellModalLayerProps {
  isCommandPaletteOpen: boolean;
  onCloseCommandPalette: () => void;
  isShortcutsOpen: boolean;
  onCloseShortcuts: () => void;
}

export const ShellModalLayer: React.FC<ShellModalLayerProps> = ({
  isCommandPaletteOpen,
  onCloseCommandPalette,
  isShortcutsOpen,
  onCloseShortcuts,
}) => {
  return (
    <>
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={onCloseCommandPalette}
      />

      <VariableFillerModal />
      <ActionEditorModal />
      
      <ShortcutsModal 
        isOpen={isShortcutsOpen}
        onClose={onCloseShortcuts}
      />
    </>
  );
};
