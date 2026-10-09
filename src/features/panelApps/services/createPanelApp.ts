import { PanelAppManifest, PanelAppRecord } from '../../../contracts/data_shapes';
import { PanelAppManifestSchema } from '../../../contracts/boundarySchemas';
import { buildCntxtApp, parseCntxtApp } from '../format/cntxtApp';
import { scanHtml } from '../preflight/scan';
import { IRuntimeBridge } from '../../../ui-contract/bridgeContract';
import { usePanelAppsStore } from '../state/panelAppsStore';

export function newAppId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return 'a' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 40) || 'app';
}

export interface CreatePanelAppInput {
  details: {
    name: string;
    icon: string;
    description: string;
    network: 'offline' | 'cdn';
    panelWidth: number;
  };
  html: string;
  createdFrom: 'file' | 'tab' | 'prompt';
}

export interface CreatePanelAppResult {
  manifest: PanelAppManifest;
  record: PanelAppRecord;
  filePath: string;
}

export async function createPanelApp(
  input: CreatePanelAppInput,
  bridge: IRuntimeBridge,
  workspacePath?: string | null
): Promise<CreatePanelAppResult> {
  // 1) Re-verify preflight guards
  const preflight = scanHtml(input.html);
  if (preflight.blocked) {
    throw new Error('Panel App exceeds the hard 2MB size limit');
  }

  // 2) Generate stable origin-safe app ID and parse manifest
  const appId = newAppId();
  const manifestData: PanelAppManifest = {
    schemaVersion: 1,
    id: appId,
    runtime: 'html',
    createdFrom: input.createdFrom,
    name: input.details.name.trim(),
    icon: input.details.icon || 'Layers',
    description: input.details.description.trim(),
    network: input.details.network,
    panelWidth: input.details.panelWidth,
  };

  const manifest = PanelAppManifestSchema.parse(manifestData);

  // 3) Build .cntxt format and execute safety round-trip verification
  const cntxtContent = buildCntxtApp(manifest, input.html);
  const roundTrip = parseCntxtApp(cntxtContent);
  if (!roundTrip.ok) {
    const errMsg = 'error' in roundTrip ? roundTrip.error : 'Validation failed';
    throw new Error(`Generated .cntxt document verification failed: ${errMsg}`);
  }
  if (roundTrip.html.trimEnd() !== input.html.trimEnd()) {
    throw new Error('Integrity check failed: parsed HTML diverged from original source');
  }

  // 4) Compute destination file path
  const safeBase = sanitizeFileName(manifest.name);
  const relativeSubpath = `Panel Apps/${safeBase}-${appId.slice(0, 6)}.cntxt`;
  const targetPath = workspacePath
    ? `${workspacePath.replace(/[/\\]+$/, '')}/${relativeSubpath}`
    : relativeSubpath;

  // 5) Write file through filesystem bridge
  let saved = await bridge.fs.saveFile(targetPath, cntxtContent);
  let finalPath = targetPath;

  // If relative save failed (e.g. no open workspace), fallback to saveFileAs dialog
  if (!saved && bridge.fs.saveFileAs) {
    const chosenPath = await bridge.fs.saveFileAs(`${safeBase}.cntxt`, cntxtContent);
    if (!chosenPath) {
      throw new Error('Save was cancelled or failed to write file');
    }
    finalPath = chosenPath;
    saved = true;
  }

  if (!saved) {
    throw new Error(`Failed to save panel app file to: ${targetPath}`);
  }

  // 6) Register in Panel Apps Store index
  const record: PanelAppRecord = {
    id: manifest.id,
    path: finalPath,
    name: manifest.name,
    icon: manifest.icon,
    network: manifest.network,
    panelWidth: manifest.panelWidth,
  };

  usePanelAppsStore.getState().add(record, bridge.storage);
  usePanelAppsStore.getState().open(record.id);

  return { manifest, record, filePath: finalPath };
}
