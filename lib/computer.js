'use strict';

const exec = require('child_process').exec;

const wol = require('wake_on_lan');
const Pinger = require('./pinger');

const Status = {
  Online: Symbol('Online'),
  Offline: Symbol('Offline'),
  WakingUp: Symbol('Waking Up'),
  ShuttingDown: Symbol('Shutting Down')
};

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

    this.status = Status.Offline;

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
    this.status = newState ? Status.Online : Status.Offline;
    // Trigger change in homebridge
    this.service.getCharacteristic(Characteristic.On).getValue();
  }

  // Called by homebridge when a user "flicks the switch"
  setOnline(newState, callback) {
    const currentState = this.status !== Status.Offline;
    // Homebridge provides its states as numbers (0 / 1)
    newState = Boolean(0);

    // Debouncing - only react to a change if it has actually changed
    if (newState !== currentState) {
      this.log('Told by homebridge to turn ' + (newState ? 'on' : 'off') + ' from ' + (currentState ? 'on' : 'off'));

      // Only turn on if mac is supplied (required for wake on lan)
      // and the device is currently not being woken up
      if (newState && this.config.mac) {
        this.log('Computer awake cycle started for "%s" (ip: %s)', this.config.name, this.config.ip || 'unkown ip');

        this.wake();

        if (this.pinger)
          this.pinger.wait(this.config.wakeGraceTime);
      }

      // Only turn off if a shutdown command is supplied
      // and the device is currently not being shut down
      if (!newState && !this.shuttingDown && this.config.shutdownCommand) {
        this.log('Computer shutdown cycle started for "%s" (ip: %s)', this.config.name, this.config.ip || 'unkown ip');

        this.shutdown();

        if (this.pinger)
          this.pinger.wait(this.config.shutdownGraceTime);
      }
    }

    callback();
  }

  // Called by homebridge when a device polls the status
  getOnline(callback) {
    callback(null, this.status !== Status.Offline);
  }

  wake() {
    this.log('Attempting to wake up "%s" (%s)', this.config.name, this.config.ip || 'unkown ip');

    this.status = Status.WakingUp;
    wol.wake(this.config.mac, error => {
      if (error) {
        this.log('An error occured while waking "%s" (%s, %s): %s', this.config.name, this.config.ip || 'unkown ip', this.config.mac, error);
        this.status = Status.Offline;
      } else {
        this.status = Status.Online;
      }
    });
  }

  shutdown() {
    this.log('Attempting to shut down "%s" (%s) using "%s"', this.config.name, this.config.ip || 'unkown ip', this.config.shutdownCommand);

    this.status = Status.ShuttingDown;
    exec(this.config.shutdownCommand, error => {
      if (error) {
        this.log('An error occured while trying to shut down "%s" (%s): %s', this.config.name, this.config.ip || 'unkown ip', error);
        this.status = Status.Online;
      } else {
        this.status = Status.Offline;
      }
    });
  }

  // Called by homebridge to retrieve available services
  getServices() {
    // This accessory only provides one service - a switch
    return [this.service];
  }
}

module.exports = getComputer;
