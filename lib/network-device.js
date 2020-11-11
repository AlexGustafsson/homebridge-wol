const {promisify} = require('util');
const exec = promisify(require('child_process').exec);

const Pinger = require('./pinger');
const {wake, wait, getSymbolDescription} = require('./util');

const Status = {
  Online: Symbol('Online'),
  Offline: Symbol('Offline'),
  WakingUp: Symbol('Waking Up'),
  ShuttingDown: Symbol('Shutting Down')
};

let Service;
let Characteristic;
var FakeGatoHistoryService;


function getNetworkDevice(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  FakeGatoHistoryService = require('fakegato-history')(homebridge);
  return NetworkDevice;
}

// NetworkDevice accessory, holds Switch service
class NetworkDevice {
  constructor(log, config) {
    this.config = {
      name: 'My NetworkDevice',

      ip: null,
      pingInterval: 2,
      pingsToChange: 5,
      pingTimeout: 1,
      pingCommand: null,
      pingCommandTimeout: 0,

      mac: null,
      broadcastAddress: null,
      startCommand: null,
      startCommandTimeout: 0,
      wakeGraceTime: 45,
      wakeCommand: null,
      wakeCommandTimeout: 0,

      shutdownCommand: null,
      shutdownGraceTime: 15,
      shutdownCommandTimeout: 0,

      manufacturer: "ACME",
      model: "Model Info",
      serialNumber: "ABCD",

      log: true,
      logPinger: false,
      debugLog: false,

      returnEarly: false,
      ...config
    };

    // Convert config from seconds to milliseconds
    this.config = Object.assign(this.config, {
      pingInterval: this.config.pingInterval * 1000,
      wakeGraceTime: this.config.wakeGraceTime * 1000,
      shutdownGraceTime: this.config.shutdownGraceTime * 1000,
      pingTimeout: this.config.pingTimeout * 1000,
      pingCommandTimeout: this.config.pingCommandTimeout * 1000,
      startCommandTimeout: this.config.startCommandTimeout * 1000,
      wakeCommandTimeout: this.config.wakeCommandTimeout * 1000,
      shutdownCommandTimeout: this.config.shutdownCommandTimeout * 1000,
    });

    // Dummy funcion if logging is turned off
    this.log = (process.env.DEBUG === '*' || this.config.log) ? log : () => {};
    this.debugLog = (process.env.DEBUG === '*' || this.config.debugLog) ? log : () => {};
    this.pingLog = (process.env.DEBUG === '*' || this.config.logPinger) ? log : () => {};

    this.onlineStatus = Status.Offline;
    this.status = 0;


    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.config.manufacturer)
      .setCharacteristic(Characteristic.Model, this.config.model)
      .setCharacteristic(Characteristic.SerialNumber, this.config.serialNumber)
      .setCharacteristic(Characteristic.FirmwareRevision, require('.././package.json').version);

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

    
    this.loggingService = new FakeGatoHistoryService("switch", this.service, {
		storage:'fs'
		//path:'./fakegato/'  // if empty it will be used the -U homebridge option if present, or .homebridge in the user's home folder
	});
  }

  setStatus(newStatus) {
    // Debouncing - only react to a change if it has actually changed
    if (newStatus !== this.onlineStatus) {
      this.log('NetworkDevice "%s" (%s) went from status "%s" to "%s"', this.config.name, this.config.ip || 'unknown ip', getSymbolDescription(this.onlineStatus), getSymbolDescription(newStatus));

      this.onlineStatus = newStatus;

      // Trigger change in homebridge
      this.service.getCharacteristic(Characteristic.On).updateValue(this.onlineStatus === Status.WakingUp || this.onlineStatus === Status.Online);

      this.loggingService.addEntry({
        time: Math.round(new Date().valueOf() / 1000), 
        status: this.status
      });
    }
  }

  stateChanged(isOnline) {
    this.debugLog('Got state change from pinger for "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', isOnline ? 'online' : 'offline');

    
    if (isOnline && this.onlineStatus !== Status.Online) {
      // The device has been turned on
      this.pingLog('Pinger saw device online; setting to Online.');
      this.setStatus(Status.Online);
      this.status = 1;
    } else if (!isOnline && this.onlineStatus !== Status.Offline) {
      // The device has gone offline
      this.pingLog('Pinger can\'t see device; setting to Offline.');
      this.setStatus(Status.Offline);
      this.status = 0;
    }
  }

  // Called by homebridge when a user "flicks the switch"
  async setOnline(newState, callback) {
    this.debugLog('Got state change for "%s" (%s): %d', this.config.name, this.config.ip || 'unknown ip', newState);

    // Don't allow user to change the state when waking up or shutting down
    if (this.onlineStatus === Status.WakingUp || this.onlineStatus === Status.ShuttingDown)
      return callback();

    const isOnline = this.onlineStatus === Status.Online;
    // Homebridge provides its states as numbers (0 / 1)
    const shouldBeOnline = Boolean(newState);

    // Debouncing - no change is necessary if we're currently in the correct state
    if (shouldBeOnline === isOnline)
      return callback();

    if (shouldBeOnline) {
      this.log('NetworkDevice awake cycle started for "%s" (%s)', this.config.name, this.config.ip || 'unknown ip');

      // Conditionally wait for the wake cycle to complete to mitigate Siri issue
      // See https://github.com/AlexGustafsson/homebridge-wol/issues/85
      if (this.config.returnEarly)
        this.wake();
      else
        await this.wake();
    } else {
      this.log('NetworkDevice shutdown cycle started for "%s" (%s)', this.config.name, this.config.ip || 'unknown ip');

      // Conditionally wait for the wake cycle to complete to mitigate Siri issue
      // See https://github.com/AlexGustafsson/homebridge-wol/issues/85
      if (this.config.returnEarly)
        this.shutdown();
      else
        await this.shutdown();
    }

    return callback();
  }

  // Called by homebridge when a device polls the status
  getOnline(callback) {
    this.debugLog('Got state request for "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', getSymbolDescription(this.onlineStatus));

    callback(null, this.onlineStatus === Status.Online || this.onlineStatus === Status.WakingUp);
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
      this.log('Attempting to start "%s" (%s) by sending a WoL packet', this.config.name, this.config.ip || 'unknown ip');

      try {
        await wake(this.config.mac, {address: this.config.broadcastAddress});
      } catch (error) {
        this.log('An error occured while trying to start "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', error);
      }

      woke = true;
    }

    if (this.config.startCommand) {
      const commandName = this.config.wakeCommand.split(' ')[0];
      this.log('Attempting to start "%s" (%s) using "%s"', this.config.name, this.config.ip || 'unknown ip', commandName);

      try {
        await exec(this.config.startCommand, {timeout: this.config.startCommandTimeout});
      } catch (error) {
        this.log('An error occured while trying to start "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', error);
        this.debugLog(error);
      }

      woke = true;
    }

    if (woke) {
      this.log('Waiting for wake grace time (%dms) for "%s" (%s)', this.config.wakeGraceTime, this.config.name, this.config.ip);
      await wait(this.config.wakeGraceTime);
    }

    // Wake up using a wake command if available
    if (woke && this.config.wakeCommand) {
      const commandName = this.config.wakeCommand.split(' ')[0];
      this.log('Attempting to wake up "%s" (%s) using "%s"', this.config.name, this.config.ip || 'unknown ip', commandName);

      try {
        await exec(this.config.wakeCommand, {timeout: this.config.wakeCommandTimeout});
      } catch (error) {
        this.log('An error occured while trying to wake "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', error);
        this.debugLog(error);
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
        await exec(this.config.shutdownCommand, {timeout: this.config.shutdownCommandTimeout});
      } catch (error) {
        this.log('An error occured while trying to shut down "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', error);
        this.debugLog(error);
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
    return [this.informationService, this.service, this.loggingService];
  }
}

module.exports = getNetworkDevice;
