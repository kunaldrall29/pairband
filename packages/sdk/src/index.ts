/** SDK scaffold — ABIs and typed builders arrive after O03+. */
export type ManifestMode = 'preview' | 'testnet' | 'mainnet';

export interface DeploymentManifest {
  schemaVersion: number;
  mode: ManifestMode;
  verified: boolean;
  chainId: number | null;
}

export function assertManifestAllowsActions(manifest: DeploymentManifest): void {
  if (!manifest.verified) {
    throw new Error('Deployment manifest is not verified; financial actions blocked');
  }
  if (manifest.mode === 'preview') {
    throw new Error('Preview mode cannot prepare financial transactions');
  }
  if (manifest.mode === 'mainnet' && manifest.chainId == null) {
    throw new Error('Mainnet chainId is null until verified');
  }
}
