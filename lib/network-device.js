const {promisify} = require('util');
const exec = promisify(require('child_process').exec);

const Pinger = require('./pinger');
const {wake, wait} = require('./util');

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
      pingsToChange: 5,
      wakeGraceTime: 45,
      shutdownGraceTime: 15,
      timeout: 1,
      log: true,
      debugLog: false,
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
    this.debugLog = (process.env.DEBUG === '*' || this.config.debugLog) ? log : () => {};
    this.pingLog = (process.env.DEBUG === '*' || this.config.logPinger) ? log : () => {};

    this.status = Status.Offline;

    // Set up a homebridge service - a switch
    this.service = new Service.Switch(config.name);
    this.service.getCharacteristic(Characteristic.On)
      .on('set', this.setOnline.bind(this))
      .on('get', this.getOnline.bind(this));

    if (this.config.ip || this.config.pingCommand) {
      this.pinger = new Pinger(this.log, this.pingLog, this.debugLog, this.config);
      this.pinger.on('stateChanged', this.stateChanged.bind(this));
      this.pinger.start();
    }
  }

  setStatus(newStatus) {
    // Debouncing - only react to a change if it has actually changed
    if (newStatus !== this.status) {
      this.log('NetworkDevice "%s" (%s) went from status "%s" to "%s"', this.config.name, this.config.ip || 'unknown ip', this.status.description, newStatus.description);

      this.status = newStatus;

      // Trigger change in homebridge
      this.service.getCharacteristic(Characteristic.On).updateValue(this.status === Status.WakingUp || this.status === Status.Online);
    }
  }

  stateChanged(isOnline) {
    this.debugLog('Got state change from pinger for "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', isOnline ? 'online' : 'offline');

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
  async setOnline(newState, callback) {
    this.debugLog('Got state change for "%s" (%s): %d', this.config.name, this.config.ip || 'unknown ip', newState);

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

      await this.wake();
    } else {
      this.log('NetworkDevice shutdown cycle started for "%s" (%s)', this.config.name, this.config.ip || 'unknown ip');

      await this.shutdown();
    }

    return callback();
  }

  // Called by homebridge when a device polls the status
  getOnline(callback) {
    this.debugLog('Got state request for "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', this.status.description);

    callback(null, this.status === Status.Online || this.status === Status.WakingUp);
  }

  async wake() {
    this.log('Attempting to wake up "%s" (%s)', this.config.name, this.config.ip || 'unknown ip');

    this.setStatus(Status.WakingUp);

    // Disable the pinger
    if (this.pinger)
      this.pinger.stop();

    let woke = false;

    // Wake up using WoL if available
    if (this.config.mac) {
      try {
        await wake(this.config.mac, {address: this.config.broadcastAddress});
      } catch (error) {
        this.log('An error occured while waking "%s" (%s, %s): %s', this.config.name, this.config.ip || 'unknown ip', this.config.mac, error);
      }

      woke = true;
    }

    // Further methods of waking up a device such as a "bootCommand" can be added here

    if (woke) {
      this.log('Waiting for wake grace time (%dms) for "%s" (%s)', this.config.wakeGraceTime, this.config.name, this.config.ip);
      await wait(this.config.wakeGraceTime);
    }

    // Wake up using a wake command if available
    if (woke && this.config.wakeCommand) {
      const commandName = this.config.wakeCommand.split(' ')[0];
      this.log('Attempting to wake up "%s" (%s) using "%s"', this.config.name, this.config.ip || 'unknown ip', commandName);

      try {
        await exec(this.config.wakeCommand);
      } catch (error) {
        this.log('An error occured while trying to wake "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', error);
      }
    }

    if (!woke) {
      this.log('No way of waking "%s" (%s) was configured', this.config.name, this.config.ip || 'unknown ip');
      this.setStatus(Status.Offline);
    }

    if (this.pinger)
      this.pinger.start();
  }

  async shutdown() {
    this.setStatus(Status.ShuttingDown);

    // Disable the pinger
    if (this.pinger)
      this.pinger.stop();

    let shutDown = false;

    if (this.config.shutdownCommand) {
      const commandName = this.config.shutdownCommand.split(' ')[0];
      this.log('Attempting to shut down "%s" (%s) using "%s"', this.config.name, this.config.ip || 'unknown ip', commandName);

      try {
        await exec(this.config.shutdownCommand);
      } catch (error) {
        this.log('An error occured while trying to shut down "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', error);
      }

      shutDown = true;
    }

    if (shutDown) {
      this.log('Waiting for shutdown grace time (%dms) for "%s" (%s)', this.config.shutdownGraceTime, this.config.name, this.config.ip);
      await wait(this.config.shutdownGraceTime);
    } else {
      this.log('No way of shutting down "%s" (%s) was configured', this.config.name, this.config.ip || 'unknown ip');
      this.setStatus(Status.Online);
    }

    if (this.pinger)
      this.pinger.start();
  }

  // Called by homebridge to retrieve available services
  getServices() {
    // This accessory only provides one service - a switch
    return [this.service];
  }
}

module.exports = getNetworkDevice;
