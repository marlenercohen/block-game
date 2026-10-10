// GitHub Pages serves the site from https://<user>.github.io/<repo>/ (a sub-path), so assets must be
// referenced relatively. base './' works for any repo name; set VITE_BASE=/my-repo/ to force an absolute sub-path.
// Rapier's "compat" build embeds its WebAssembly as base64 inside the JS bundle, so no separate .wasm file
// needs to be served.
export default {
  base: process.env.VITE_BASE ?? './',
  server: { port: 5173 },
  build: { target: 'esnext', chunkSizeWarningLimit: 6000 },
};
