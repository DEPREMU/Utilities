export default function ({ types: t }) {
  return {
    name: "remove-logger",

    visitor: {
      VariableDeclarator(path) {
        if (process.env.BUILD_PROFILE !== "production") return;

        const { id, init } = path.node;

        if (!t.isIdentifier(id) || !t.isNewExpression(init)) return;

        const callee = init.callee;

        const isLogger =
          t.isIdentifier(callee, { name: "Logger" }) ||
          (t.isMemberExpression(callee) &&
            t.isIdentifier(callee.property, {
              name: "Logger",
            }));

        if (!isLogger) return;

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
