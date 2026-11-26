import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // .claude/ and .curator/ are local tool state (agent worktrees, SQLite); never lint them.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".claude/**", ".curator/**"]),
]);

export default eslintConfig;
