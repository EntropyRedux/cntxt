import React from 'react';
import { CommandPalette } from '../components/Modals/CommandPalette';
import { VariableFillerModal } from '../components/Modals/VariableFillerModal';
import { VariableExtractionModal } from '../components/Modals/VariableExtractionModal';
import { LargeDocModal } from '../components/Modals/LargeDocModal';
import { ShortcutsModal } from '../components/Modals/ShortcutsModal';
import { RibbonCustomizerModal } from '../components/Modals/RibbonCustomizerModal';
import { FormattingCustomizerModal } from '../components/Modals/FormattingCustomizerModal';
import { InsertImageModal } from '../components/Modals/InsertImageModal';
import { FontSelectorModal } from '../components/Modals/FontSelectorModal';
import { OnboardingModal } from '../components/Modals/OnboardingModal';
import { ConfirmationModal } from '../components/Common/ConfirmationModal';

export interface ShellModalLayerProps {
  isCommandPaletteOpen: boolean;
  onCloseCommandPalette: () => void;
  isShortcutsOpen: boolean;
  onCloseShortcuts: () => void;
  isOnboardingOpen?: boolean;
  onCloseOnboarding?: () => void;
}

export const ShellModalLayer: React.FC<ShellModalLayerProps> = ({
  isCommandPaletteOpen,
  onCloseCommandPalette,
  isShortcutsOpen,
  onCloseShortcuts,
  isOnboardingOpen = false,
  onCloseOnboarding,
}) => {
  return (
    <>
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={onCloseCommandPalette}
      />

      <VariableFillerModal />
      <VariableExtractionModal />
      <LargeDocModal />
      <RibbonCustomizerModal />
      <FormattingCustomizerModal />
      <InsertImageModal />
      <FontSelectorModal />
      
      <ShortcutsModal 
        isOpen={isShortcutsOpen}
        onClose={onCloseShortcuts}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={onCloseOnboarding}
      />

      <ConfirmationModal />
    </>
  );
};
