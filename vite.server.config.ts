import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  build: {
    emptyOutDir: false,
    ssr: path.resolve(rootDir, "src/server/index.ts"),
    outDir: path.resolve(rootDir, "dist/server"),
    target: "node22",
    rollupOptions: {
      external: builtinModules,
      output: {
        entryFileNames: "index.js",
        format: "cjs",
        inlineDynamicImports: true,
      },
    },
  },
});
