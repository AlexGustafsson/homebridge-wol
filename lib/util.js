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

module.exports = {
  wake,
  wait
};
