const fn = (s) => s;
const chalk = fn;

chalk.green = (s) => `\x1b[32m${s}\x1b[39m`;
chalk.red = (s) => `\x1b[31m${s}\x1b[39m`;
chalk.yellow = (s) => `\x1b[33m${s}\x1b[39m`;
chalk.blue = (s) => `\x1b[34m${s}\x1b[39m`;
chalk.gray = (s) => `\x1b[90m${s}\x1b[39m`;
chalk.white = (s) => `\x1b[37m${s}\x1b[39m`;
chalk.bold = (s) => `\x1b[1m${s}\x1b[22m`;

chalk.green.bold = (s) => `\x1b[32m\x1b[1m${s}\x1b[22m\x1b[39m`;
chalk.yellow.bold = (s) => `\x1b[33m\x1b[1m${s}\x1b[22m\x1b[39m`;
chalk.red.bold = (s) => `\x1b[31m\x1b[1m${s}\x1b[22m\x1b[39m`;

module.exports = chalk;
module.exports.default = chalk;
