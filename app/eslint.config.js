import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactNative from "eslint-plugin-react-native";

export default [
  {
    ignores: [
      "node_modules/**",
      "server/node_modules/**",
      "server/dist/**",
      "dist/**",
      "build/**",
      ".expo/**",
      ".metro/**",
      ".yarn/**",
      "android/**",
      "ios/**",
      "assets/**",
      "images/**",
      "coverage/**",
      "*.config.js",
      "babel.config.js",
      "metro.config.js",
      "app.config.js",
      "*.generated.*",
      "*.d.ts",
      "*.log",
      ".env*",
      ".DS_Store",
      "Thumbs.db",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        localStorage: "readonly",
        document: "readonly",
        __DEV__: "readonly",
        NodeJS: "readonly",
        KeyboardEvent: "readonly",
        Express: "readonly",
        ReactNavigation: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      react,
      "react-hooks": reactHooks,
      "react-native": reactNative,
    },
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // React rules
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/display-name": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // React Native rules
      "react-native/no-unused-styles": "warn",
      "react-native/split-platform-components": "error",
      "react-native/no-inline-styles": "warn",
      "react-native/no-color-literals": "off", // Deshabilitado temporalmente
      "react-native/no-raw-text": "off",

      // General rules
      "no-console": "off",
      "no-unused-vars": "off",
      "no-undef": "warn",
      "no-empty": "warn",
      "prefer-const": "error",
      "no-var": "error",
      semi: ["error", "always"],
      quotes: ["warn", "double"],
      indent: ["warn", 2],
      "comma-dangle": ["warn", "always-multiline"],
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],
      "require-yield": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
