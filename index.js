'use strict';

const getComputer = require('./lib/computer');

function setup(homebridge) {
  const Computer = getComputer(homebridge.hap);

  homebridge.registerAccessory('homebridge-wol', 'Computer', Computer);
}

module.exports = setup;
