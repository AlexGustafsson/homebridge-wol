// const getNetworkDevice = require('./lib/network-device');

// function setup(homebridge) {
//   const NetworkDevice = getNetworkDevice(homebridge.hap);

//   homebridge.registerAccessory('homebridge-wol', 'NetworkDevice', NetworkDevice);
// }

// module.exports = setup;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  const NetworkDevice = require('./lib/network-device');
  FakeGatoHistoryService = require('fakegato-history')(homebridge);

  homebridge.registerAccessory('homebridge-wol', 'NetworkDevice', NetworkDevice);
};