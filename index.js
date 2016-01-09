"use strict";

var wol = require("wake_on_lan");

var Service, Characteristic;

module.exports = function(homebridge) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-wol", "Computer", Computer);
}

function Computer(log, config) {
  this.log = log;
  this.name = config.name;
  this.mac = config.mac;

  this._service = new Service.Switch(this.name);
  this._service.getCharacteristic(Characteristic.On)
    .on('set', this._setOn.bind(this));
}

Computer.prototype.getServices = function() {
  return [this._service];
}

Computer.prototype._setOn = function(on, callback) {

  if(on){
    wol.wake(this.name, function(error) {
      if (error) {
        this._service.setCharacteristic(Characteristic.On, false);
        this.log("Error when sending packets", error);
      } else {
        this.log("Packets sent");
        setTimeout(function() {
          this._service.setCharacteristic(Characteristic.On, false);
        }.bind(this), 30000);
      }
    });
  }

  callback();
}
