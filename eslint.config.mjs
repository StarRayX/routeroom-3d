// ESLint 9 flat config for RouteRoom 3D.
//
// eslint-config-next (as pinned in package.json) only ships its legacy
// eslintrc-format config (index.js / core-web-vitals.js), not a flat-config
// export. This file bridges it with FlatCompat from @eslint/eslintrc, which
// is already present in node_modules as a transitive dependency. If a future
// eslint-config-next version ships a native flat export (for example
// "eslint-config-next/flat" or "eslint-config-next/core-web-vitals" as an
// ESM flat array), switch to importing that directly and drop FlatCompat.
import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "node_modules/**", "coverage/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Keep the demo's tool-console and WebMCP glue code readable without
      // fighting the linter over intentional `any` at untrusted boundaries.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
