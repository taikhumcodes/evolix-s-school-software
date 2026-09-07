// Dev-only. Imported automatically by @reticlehq/vite-plugin, so you do not need to import it.
// Self-guards on import.meta.env.DEV, so it is a no-op in a production build.
import { registerCapabilities, registerStore, tanstackQueryStore } from '@reticlehq/react';

import { queryClient } from './main';

if ((import.meta as any).env?.DEV) {
  registerStore('queries', tanstackQueryStore(queryClient));

  registerCapabilities({
    testids: [],
    signals: [],
    stores: ['queries'],
  });
}
