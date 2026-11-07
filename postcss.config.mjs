import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Point Tailwind at this folder's config explicitly. Without it, a parent folder that also has a
// lockfile (e.g. a git worktree inside the main checkout) becomes the workspace root and Tailwind
// silently compiles with that other tailwind.config.ts.
const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: { config: path.join(here, 'tailwind.config.ts') },
    autoprefixer: {},
  },
};

export default config;
