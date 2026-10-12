import fs from "node:fs";
import path from "node:path";

let _srcPath = process.cwd();
let attempts = 3;

while (!fs.existsSync(path.join(_srcPath, "src")) && attempts-- > 0) {
  _srcPath = path.resolve(_srcPath, "..");
}
_srcPath = path.resolve(_srcPath, "src");

export default function ({ types: t }) {
  function isInsideSrc(filename) {
    if (!filename) return false;

    const relative = path.relative(_srcPath, path.resolve(filename));

    return (
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    );
  }

  function isLoggerConstructor(node) {
    if (!t.isNewExpression(node)) return false;

    const callee = node.callee;

    return (
      t.isIdentifier(callee, { name: "Logger" }) ||
      (t.isMemberExpression(callee) &&
        t.isIdentifier(callee.property, { name: "Logger" }))
    );
  }

  return {
    name: "remove-logger-instances",

    visitor: {
      VariableDeclarator(path, state) {
        if (process.env.BUILD_PROFILE !== "production") return;
        if (!isInsideSrc(state.filename)) return;

        if (!isLoggerConstructor(path.node.init)) return;

        path.remove();

        const declaration = path.parentPath;

        if (
          declaration.isVariableDeclaration() &&
          declaration.node.declarations.length === 0
        )
          declaration.remove();
      },
    },
  };
}
