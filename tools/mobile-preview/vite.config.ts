import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: { '@sma/ui': path.resolve(import.meta.dirname, '../../packages/ui/src/index.tsx'), ...Object.fromEntries(['lucide-react','@radix-ui/react-slot','class-variance-authority','clsx','tailwind-merge'].map(name => [name, path.resolve(import.meta.dirname, 'node_modules', name)])) },
    dedupe: ['react', 'react-dom'],
  },
  define: {
    'process.env.NEXT_PUBLIC_PREVIEW_MODE': JSON.stringify('local'),
    'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(''),
    'process.env.NEXT_PUBLIC_WORKSPACE_ID': JSON.stringify('phone-preview'),
  },
  esbuild: { jsx: 'automatic' },
  build: { outDir: 'dist', emptyOutDir: true },
});
