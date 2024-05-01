const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended
);

// export default [
//   {
//     languageOptions: {
//       parser: tsParser,
//     },
//     plugins: ["@typescript-eslint", "prettier"],
//     extends: [
//       "eslint:recommended",
//       "plugin:@typescript-eslint/eslint-recommended",
//       "plugin:@typescript-eslint/recommended",
//       "prettier",
//     ],
//     env: {
//       browser: false,
//       node: true,
//     },
//     rules: {
//       "no-var": "error",
//     },
//     ignorePatterns: ["dist/node/*"],
//   },
// ];
