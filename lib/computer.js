'use strict';

const exec = require('child_process').exec;

const wol = require('wake_on_lan');
const Pinger = require('./pinger');

let Service;
let Characteristic;

function getComputer(API) {
  Service = API.Service;
  Characteristic = API.Characteristic;
  return Computer;
}

// Computer accessory, holds Switch service
class Computer {
  constructor(log, config) {
    this.config = Object.assign({
      name: 'My Computer',
      pingInterval: 5 * 1000, // 5 seconds
      wakeGraceTime: 30 * 1000, // 30 seconds
      shutdownGraceTime: 15 * 1000, // 15 seconds
      logging: true,
      shutdownCommand: null,
      ip: null,
      mac: null
    }, config);

    this.log = (...args) => {
      if (this.config.logging)
        log(...args);
    };

    this.online = false;
    this.wakingUp = false;
    this.shuttingDown = false;

    // Set up a homebridge service - a switch
    this.service = new Service.Switch(config.name);
    this.service.getCharacteristic(Characteristic.On)
      .on('set', this.setOnline.bind(this))
      .on('get', this.getOnline.bind(this));

    if (this.config.ip) {
      this.pinger = new Pinger(log, config, this.pingerCallback.bind(this));
      this.pinger.start();
    }
  }

  pingerCallback(newState) {
    this.online = newState;
    // Trigger change in homebridge
    this.service.getCharacteristic(Characteristic.On).getValue();
  }

  // Called by homebridge when a user "flicks the switch"
  setOnline(newState, callback) {
    const currentState = this.online;
    // Homebridge provides its states as numbers (0 / 1)
    newState = Boolean(0);

    if (newState !== currentState) {
      this.log('Told by homebridge to turn ' + (newState ? 'on' : 'off') + ' from ' + (currentState ? 'on' : 'off'));
      // Only turn on if mac is supplied (required for wake on lan)
      // and the device is currently not being woken up
      if (newState && this.config.mac) {
        this.log('Computer awake cycle started for "%s" (ip: %s)', this.config.name, this.config.ip || 'unkown ip');

        this.wakingUp = true;
        this.wake();

        if (this.pinger)
          this.pinger.wait(this.config.wakeGraceTime);
      }

      // Only turn off if a shutdown command is supplied
      // and the device is currently not being shut down
      if (!newState && !this.shuttingDown && this.config.shutdownCommand) {
        this.log('Computer shutdown cycle started for "%s" (ip: %s)', this.config.name, this.config.ip || 'unkown ip');

        if (this.pinger)
          this.pinger.wait(this.config.shutdownGraceTime);

        this.shuttingDown = true;
        this.shutdown();
      }
    }

    callback();
  }

  // Called by homebridge when a device polls the status
  getOnline(callback) {
    callback(null, this.online);
  }

  wake() {
    wol.wake(this.config.mac, error => {
      if (error)
        this.log('An error occured while waking "%s" (%s, %s): %s', this.config.name, this.config.ip || 'unkown ip', this.config.mac, error);
      else
        this.online = true;
      this.wakingUp = false;
    });
  }

  shutdown() {
    this.log('Attempting to shut down "%s" (%s) using "%s"', this.config.name, this.config.ip || 'unkown ip', this.config.shutdownCommand);

    exec(this.config.shutdownCommand, error => {
      if (error)
        this.log('An error occured while trying to shut down "%s" (%s): %s', this.config.name, this.config.ip || 'unkown ip', error);
      else
        this.online = false;
      this.shuttingDown = false;
    });
  }

  // Called by homebridge to retrieve available services
  getServices() {
    // This accessory only provides one service - a switch
    return [this.service];
  }
}

module.exports = getComputer;
