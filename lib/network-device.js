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

function getNetworkDevice(API) {
  Service = API.Service;
  Characteristic = API.Characteristic;
  return NetworkDevice;
}

// NetworkDevice accessory, holds Switch service
class NetworkDevice {
  constructor(log, config) {
    this.config = Object.assign({
      name: 'My NetworkDevice',
      pingInterval: 2,
      wakeGraceTime: 45,
      shutdownGraceTime: 15,
      timeout: 1,
      log: true,
      logPinger: false,
      shutdownCommand: null,
      wakeCommand: null,
      ip: null,
      mac: null,
      broadcastAddress: null,
      isEsxiMachine: false,
      esxiWakeCommand: null,
      esxiHostIp: null,
    }, config);

    // Convert config from seconds to milliseconds
    this.config = Object.assign(this.config, {
      pingInterval: this.config.pingInterval * 1000,
      wakeGraceTime: this.config.wakeGraceTime * 1000,
      shutdownGraceTime: this.config.shutdownGraceTime * 1000,
      timeout: this.config.timeout * 1000
    });

    // Dummy funcion if logging is turned off
    this.log = (process.env.DEBUG === '*' || this.config.log) ? log : () => {};
    this.pingLog = (process.env.DEBUG === '*' || this.config.logPinger) ? log : () => {};

    this.status = Status.Offline;

    // Set up a homebridge service - a switch
    this.service = new Service.Switch(config.name);
    this.service.getCharacteristic(Characteristic.On)
      .on('set', this.setOnline.bind(this))
      .on('get', this.getOnline.bind(this));

    if (this.config.ip) {
      this.pinger = new Pinger(this.pingLog, this.config, this.pingerCallback.bind(this));
      this.pinger.start();
    }
  }

  getValueOfSymbol(symbol) {
    return symbol.toString().replace(/Symbol\(|\)/gi, '');
  }

  setStatus(newStatus) {
    // Debouncing - only react to a change if it has actually changed
    if (newStatus !== this.status) {
      this.log('NetworkDevice "%s" (%s) went from status "%s" to "%s"', this.config.name, this.config.ip || 'unknown ip', this.getValueOfSymbol(this.status), this.getValueOfSymbol(newStatus));

      this.status = newStatus;

      // Trigger change in homebridge
      this.service.getCharacteristic(Characteristic.On).getValue();
    }
  }

  pingerCallback(newState) {
    if (newState === true) {
      // Device is online.
      if (this.status !== Status.Online) {
        this.pingLog('Pinger saw device online; setting to Online.');
        this.setStatus(Status.Online);
      }
    } else {
      // Device has gone offline.
      if (this.status !== Status.Offline) {
        this.pingLog('Pinger can\'t see device; setting to Offline.');
        this.setStatus(Status.Offline);
      }
    }
  }

  // Called by homebridge when a user "flicks the switch"
  setOnline(newState, callback) {

    // Don't allow user to change the state when waking up or shutting down
    if (this.status === Status.WakingUp || this.status === Status.ShuttingDown)
      return callback();

    const currentState = this.status !== Status.Offline;
    // Homebridge provides its states as numbers (0 / 1)
    newState = Boolean(newState);

    // Debouncing - only react to a change if it has actually changed
    if (newState !== currentState) {
      // Only turn on if mac is supplied (required for wake on lan) OR if an ESXi command is supplied
      if (this.config.isEsxiMachine && this.config.esxiWakeCommand) {
          this.log('NetworkDevice ESXi machine boot cycle started for "%s"', this.config.name);

          if (this.pinger)
            this.pinger.wait(this.config.wakeGraceTime);

          this.wake();
      }

      if (newState && this.config.mac ) {
        this.log('NetworkDevice awake cycle started for "%s" (%s)', this.config.name, this.config.ip || 'unknown ip');

        if (this.pinger)
          this.pinger.wait(this.config.wakeGraceTime);

        this.wake();
      }

      // Only turn off if a shutdown command is supplied
      if (!newState && this.config.shutdownCommand) {
        this.log('NetworkDevice shutdown cycle started for "%s" (%s)', this.config.name, this.config.ip || 'unknown ip');

        if (this.pinger)
          this.pinger.wait(this.config.shutdownGraceTime);

        this.shutdown();
      }
    }

    callback();
  }

  // Called by homebridge when a device polls the status
  getOnline(callback) {
    callback(null, this.status === Status.Online || this.status === Status.WakingUp);
  }

  wake() {
    if (this.config.isEsxiMachine) {
        this.log('ESXi Machine Detected!')
        this.boot_esxi_virtual_machine();
    } else {
        this.log('Attempting to wake up "%s" (%s)', this.config.name, this.config.ip || 'unknown ip');

        this.setStatus(Status.WakingUp);

        const options = {
          address: this.config.broadcastAddress
        };

        wol.wake(this.config.mac, options, error => {
          if (error) {
            this.log('An error occured while waking "%s" (%s, %s): %s', this.config.name, this.config.ip || 'unknown ip', this.config.mac, error);
            // The wake-up failed - let the pinger manage current status
            this.pinger.start();
          } else if (this.config.wakeCommand) {
            this.log('Attempting to wake up "%s" (%s) using "%s"', this.config.name, this.config.ip || 'unknown ip', this.config.wakeCommand);

            exec(this.config.wakeCommand, error => {
              if (error)
                this.log('An error occured while trying to wake "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', error);
            });
          }
        });
    }

  }

  boot_esxi_virtual_machine() {

    this.log('Attempting to boot ESXi virtual machine "%s" (%s) using ESXi host shell at %s', this.config.name, this.config.ip, this.config.esxiHostIp || 'unknown ip');

    this.setStatus(Status.WakingUp);

    exec(this.config.esxiWakeCommand, error => {
        if (error) {
            this.log('Something went wrong while trying to use ESXi Shell SSH to wake "%s" (%s) on host %s: %s',
        this.config.name, this.config.ip || 'unknown ip', this.config.esxiHostIp, error);
        this.pinger.start();
        }
    });


  }

  shutdown() {
    this.log('Attempting to shut down "%s" (%s) using "%s"', this.config.name, this.config.ip || 'unknown ip', this.config.shutdownCommand);

    this.setStatus(Status.ShuttingDown);

    exec(this.config.shutdownCommand, error => {
      if (error) {
        this.log('An error occured while trying to shut down "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', error);
        // The shutdown failed - let the pinger manage current status
        this.pinger.start();
      }
    });
  }

  // Called by homebridge to retrieve available services
  getServices() {
    // This accessory only provides one service - a switch
    return [this.service];
  }
}

module.exports = getNetworkDevice;
