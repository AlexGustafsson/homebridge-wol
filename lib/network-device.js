const {exec} = require('child_process');

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
      pingCommand: null,
      ip: null,
      mac: null,
      broadcastAddress: null
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

  pingerCallback(isOnline) {
    if (isOnline && this.status !== Status.Online) {
      // The device has been turned on
      this.pingLog('Pinger saw device online; setting to Online.');
      this.setStatus(Status.Online);
    } else if (!isOnline && this.status !== Status.Offline) {
      // The device has gone offline
      this.pingLog('Pinger can\'t see device; setting to Offline.');
      this.setStatus(Status.Offline);
    }
  }

  // Called by homebridge when a user "flicks the switch"
  setOnline(newState, callback) {
    // Don't allow user to change the state when waking up or shutting down
    if (this.status === Status.WakingUp || this.status === Status.ShuttingDown)
      return callback();

    const isOnline = this.status === Status.Online;
    // Homebridge provides its states as numbers (0 / 1)
    const shouldBeOnline = Boolean(newState);

    // Debouncing - no change is necessary if we're currently in the correct state
    if (shouldBeOnline === isOnline)
      return callback();

    if (shouldBeOnline) {
      this.log('NetworkDevice awake cycle started for "%s" (%s)', this.config.name, this.config.ip || 'unknown ip');

      this.wake();
    } else {
      this.log('NetworkDevice shutdown cycle started for "%s" (%s)', this.config.name, this.config.ip || 'unknown ip');

      this.shutdown();
    }
  }

  // Called by homebridge when a device polls the status
  getOnline(callback) {
    callback(null, this.status === Status.Online || this.status === Status.WakingUp);
  }

  wake() {
    this.log('Attempting to wake up "%s" (%s)', this.config.name, this.config.ip || 'unknown ip');

    this.setStatus(Status.WakingUp);

    // Disable the pinger
    if (this.pinger)
      this.pinger.stop();

    let woke = false;

    // Wake up using WoL if available
    if (this.config.mac) {
      const options = {
        address: this.config.broadcastAddress
      };

      wol.wake(this.config.mac, options, error => {
        if (error) {
          this.log('An error occured while waking "%s" (%s, %s): %s', this.config.name, this.config.ip || 'unknown ip', this.config.mac, error);
        } else if (this.config.wakeCommand) {
          const commandName = this.config.wakeCommand.replace('/s.*', '');
          this.log('Attempting to wake up "%s" (%s) using "%s"', this.config.name, this.config.ip || 'unknown ip', commandName);
        }

        if (this.pinger)
          this.pinger.start();
      });

      woke = true;
    }

    // Wake up using a wake command if available
    if (this.config.wakeCommand) {
      exec(this.config.wakeCommand, error => {
        if (error)
          this.log('An error occured while trying to wake "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', error);

        if (this.pinger)
          this.pinger.start();
      });

      woke = true;
    }

    if (!woke)
      this.log('No way of waking "%s" (%s) was configured', this.config.name, this.config.ip || 'unknown ip');
  }

  shutdown() {
    if (this.config.shutdownCommand) {
      const commandName = this.config.shutdownCommand.replace('/s.*', '');
      this.log('Attempting to shut down "%s" (%s) using "%s"', this.config.name, this.config.ip || 'unknown ip', commandName);
    }

    this.setStatus(Status.ShuttingDown);

    // Disable the pinger
    if (this.pinger)
      this.pinger.stop();

    let shutDown = false;

    if (this.config.shutdownCommand) {
      exec(this.config.shutdownCommand, error => {
        if (error)
          this.log('An error occured while trying to shut down "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', error);

        if (this.pinger)
          this.pinger.start();
      });

      shutDown = true;
    }

    if (!shutDown)
      this.log('No way of shutting down "%s" (%s) was configured', this.config.name, this.config.ip || 'unknown ip');
  }

  // Called by homebridge to retrieve available services
  getServices() {
    // This accessory only provides one service - a switch
    return [this.service];
  }
}

module.exports = getNetworkDevice;
