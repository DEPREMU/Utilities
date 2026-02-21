import js from "@eslint/js";
import globals from "globals";
import tsconfig from "typescript-eslint";
import tseslint from "@typescript-eslint/eslint-plugin";
import stylistic from "@stylistic/eslint-plugin";
import pluginReact from "eslint-plugin-react";
import prettierConfig from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import pluginReactHooks from "eslint-plugin-react-hooks";
import typescriptParser from "@typescript-eslint/parser";
import pluginReactNative from "eslint-plugin-react-native";

export default defineConfig([
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.expo/**",
      "**/.metro/**",
      "**/.yarn/**",
      "**/android/**",
      "**/assets/**",
      "**/images/**",
      "**/coverage/**",
      "**/*.generated.*",
      "**/*.d.ts",
      "**/*.log",
      "**/.env*",
      "**/.DS_Store",
      "**/Thumbs.db",
    ],
  },
  js.configs.recommended,
  tsconfig.configs.recommended,
  {
    files: ["**/*.{js,ts,jsx,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2020,
        sourceType: "module",
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        __DEV__: "readonly",
        NodeJS: "readonly",
        Express: "readonly",
        ReactNavigation: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint as any,
      "@stylistic": stylistic,
      react: pluginReact,
      "react-native": pluginReactNative,
      "react-hooks": pluginReactHooks as any,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "react/react-in-jsx-scope": "off",
      "react/jsx-no-literals": [
        "error",
        {
          noStrings: true,
          ignoreProps: true,
        },
      ],
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-native/no-inline-styles": "warn",
      "react-native/no-unused-styles": "error",
      "react-native/split-platform-components": "warn",
      "react-native/no-raw-text": "warn",
      "no-console": "warn",
      "no-unused-vars": "off",
      "no-undef": "warn",
      "no-empty": "warn",
      "prefer-const": "error",
      "no-var": "error",
      semi: ["error", "always"],
      quotes: ["warn", "double"],
      indent: "off",
      "@stylistic/indent": ["warn", 2],
      "comma-dangle": ["warn", "always-multiline"],
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],
      "require-yield": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
      "react-native": {
        version: "detect",
      },
    },
  },
  prettierConfig,
]);
