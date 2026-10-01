import { IRuntimeBridge } from '../../ui-contract/bridgeContract';

let activeBridge: IRuntimeBridge | null = null;

export function setLiveMarkdownBridge(bridge?: IRuntimeBridge) {
  if (bridge) activeBridge = bridge;
}

export function getActiveBridge(): IRuntimeBridge | null {
  return activeBridge;
}
