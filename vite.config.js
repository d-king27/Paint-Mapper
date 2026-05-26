import { fileURLToPath } from "node:url";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "/Paint-Mapper/",
  plugins: [
    {
      name: "copy-local-paint-data",
      closeBundle() {
        const source = join(projectRoot, "data", "paint-compatibility.json");
        if (!existsSync(source)) return;

        const targetDir = join(projectRoot, "dist", "data");
        mkdirSync(targetDir, { recursive: true });
        copyFileSync(source, join(targetDir, "paint-compatibility.json"));
      },
    },
  ],
  optimizeDeps: {
    include: ["react", "react-dom/client"],
    esbuildOptions: {
      absWorkingDir: projectRoot,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
});
