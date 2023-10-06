export function logGray(...args) {
  console.log('\x1b[90m', ...args, '\x1b[0m');
}