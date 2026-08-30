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
// @ts-expect-error - no types available for this package
import pluginReactNative from "eslint-plugin-react-native";
import pluginReactRefresh from "eslint-plugin-react-refresh";

export default defineConfig([
  {
    ignores: [
      "**/generated/prisma/**",
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
        ...globals.es2025,
        __DEV__: "readonly",
        NodeJS: "readonly",
        Express: "readonly",
        ReactNavigation: "readonly",
        DB: "readonly",
        FetchAPI: "readonly",
        RoutesAPI: "readonly",
        BufferEncoding: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint as unknown as typeof pluginReact,
      "@stylistic": stylistic,
      react: pluginReact,
      "react-native": pluginReactNative,
      "react-hooks": pluginReactHooks as unknown as typeof pluginReact,
      "react-refresh": pluginReactRefresh,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "error",
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

      "react-native/no-inline-styles": "error",
      "react-native/no-unused-styles": "error",
      "react-native/split-platform-components": "warn",
      "react-native/no-raw-text": "error",

      "no-console": "warn",
      "no-unused-vars": "off",
      "no-undef": "warn",
      "no-empty": "warn",

      "prefer-const": "error",
      "no-var": "error",
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
