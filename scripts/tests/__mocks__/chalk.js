const createChalkMock = () => {
  const fn = (...args) => args.join(" ");
  const handler = {
    get: (target, prop) => {
      if (prop === "default") return proxy;
      return proxy;
    },
    apply: (target, thisArg, args) => {
      return args.join(" ");
    },
  };
  const proxy = new Proxy(fn, handler);
  return proxy;
};

const chalk = createChalkMock();

module.exports = chalk;
module.exports.default = chalk;
