const wol = require('wake_on_lan');

function wake(mac, options) {
  return new Promise((resolve, reject) => {
    wol.wake(mac, options, error => {
      if (error)
        return reject(error);

      resolve();
    });
  });
}

function wait(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

function getSymbolDescription(symbol) {
  // If there's support for native description, use it
  if (symbol.description)
    return symbol.description;

  // Return the symbol's description, enclosed in 'Symbol()'
  const match = symbol.toString().match(/Symbol\((.*)\)/);
  if (match)
    return match[1];

  return 'unknown';
}

module.exports = {
  wake,
  wait,
  getSymbolDescription
};
