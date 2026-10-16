import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    modulePreload: {
      // The Firebase SDK is imported on demand (lib/firebase.ts); don't preload it from the HTML,
      // where it would compete with the code that paints the first screen.
      resolveDependencies: (_file, deps, { hostType }) => (hostType === 'html' ? deps.filter((d) => !d.includes('firebase-sdk-')) : deps),
    },
    // Long-lived vendor chunks so an app deploy doesn't invalidate Firebase or React Flow.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'firebase-sdk', test: /node_modules[\\/]@?firebase/ },
            // Shared small libraries stay out of the React Flow chunk so pages without the editor don't pull it in.
            { name: 'vendor', test: /node_modules[\\/](zustand|classcat|use-sync-external-store|radix-ui|@radix-ui|lucide-react|@floating-ui|aria-hidden|react-remove-scroll|react-remove-scroll-bar|react-style-singleton|get-nonce|use-callback-ref|use-sidecar|tslib)[\\/]/ },
            { name: 'flow', test: /node_modules[\\/]@xyflow/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
});
