import { Asset } from 'expo-asset';
import { Image } from 'expo-image';

import {
  CFOServicesIcon,
  CompanyRegistrationIcon,
  GSTFilingIcon,
  InvoiceFinancingIcon,
  ITRFilingIcon,
  TDSFilingIcon,
} from '@/constants/assets';

const SERVICE_IMAGE_MODULES = [
  CompanyRegistrationIcon,
  GSTFilingIcon,
  ITRFilingIcon,
  CFOServicesIcon,
  TDSFilingIcon,
  InvoiceFinancingIcon,
] as const;

let preloadPromise: Promise<void> | null = null;

/** Download bundled service icons once so Our Services grid shows instantly on revisit. */
export function preloadServiceImages(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = (async () => {
      await Promise.all(
        SERVICE_IMAGE_MODULES.map(async (module) => {
          const asset = Asset.fromModule(module);
          if (!asset.downloaded) {
            await asset.downloadAsync();
          }
          const uri = asset.localUri ?? asset.uri;
          if (uri) {
            try {
              await Image.prefetch(uri, 'memory-disk');
            } catch {
              /* bundled asset still available via require */
            }
          }
        }),
      );
    })();
  }
  return preloadPromise;
}
