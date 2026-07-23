import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import jest from "eslint-plugin-jest";

const eslintConfig = defineConfig([
  // Next.js-Regeln inkl. Core Web Vitals
  ...nextVitals,

  // projektspezifische Regel
  {
    rules: {
      "import/no-anonymous-default-export": [
        "error",
        {
          allowObject: true,
        },
      ],

      // während next-16-upgrade nur als Warnung; bestehende effects danach einzeln refaktoren
      "react-hooks/set-state-in-effect": "warn",
    },
  },

  // Jest-Regeln (für Tests + Jest-Setup)
  {
    ...jest.configs["flat/recommended"],
    files: [
      "**/*.test.js",
      "**/*.test.jsx",
      "**/*.spec.js",
      "**/*.spec.jsx",
      "jest.setup.js",
    ],
  },

  // generierte Dateien + build-Ausgaben nicht linten
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
