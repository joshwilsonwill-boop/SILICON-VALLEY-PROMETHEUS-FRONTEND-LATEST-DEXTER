import next from "eslint-config-next";
import reactHooks from "eslint-plugin-react-hooks";

const config = [
  ...next,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["app/**/*.tsx", "components/**/*.tsx", "hooks/**/*.ts"],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ 
          name: '@/lib/crypto/token-vault', 
          message: 'Token vault is server-only. Never import in frontend code.' 
        }]
      }]
    }
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
      // Vendored bklit-ui chart registry (copied from bklit.com; lint upstream style as-is)
      "components/analytics/bklit/**",
    ],
  },
];

export default config;
