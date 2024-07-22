const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": ["warn"]
    }
  },
  eslintPluginPrettierRecommended,
  {
    ignores: ["dist/*", "**/*.js"],
  }
);
