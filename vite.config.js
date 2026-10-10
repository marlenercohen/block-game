import { execSync } from 'node:child_process';

// Build identifier shown in the behavioural logs (git short hash, '-dirty' if uncommitted changes exist).
let version = 'unknown';
try { version = execSync('git rev-parse --short HEAD').toString().trim() + (execSync('git status --porcelain').toString().trim() ? '-dirty' : ''); } catch { /* not a git checkout */ }

// GitHub Pages serves the site from https://<user>.github.io/<repo>/ (a sub-path), so assets must be
// referenced relatively. base './' works for any repo name; set VITE_BASE=/my-repo/ to force an absolute sub-path.
// Rapier's "compat" build embeds its WebAssembly as base64 inside the JS bundle, so no separate .wasm file
// needs to be served.
export default {
  define: { __APP_VERSION__: JSON.stringify(version) },
  base: process.env.VITE_BASE ?? './',
  server: { port: 5173 },
  build: { target: 'esnext', chunkSizeWarningLimit: 6000 },
};
