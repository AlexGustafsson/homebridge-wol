"use strict";

var wol = require("wake_on_lan"),
  ping = require("net-ping"),
  exec = require('child_process').exec,
  Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-wol", "Computer", Computer);
};

function Computer(log, config) {

  var service = new Service.Switch(config.name || "My Computer"),
    pingInterval = 1000 * (config.pingInterval || 5),
    wakeGraceTime = 1000 * (config.wakeGraceTime || 30),
    shutdownGraceTime = 1000 * (config.shutdownGraceTime || 15),
    isOnline = false,
    self = this;

  var pinger = new Pinger(config, pingInterval, function(state) {
    this.setOnline(state);
  }.bind(this), log).start();

  service.getCharacteristic(Characteristic.On)
    .on('set', function(newValue, callback) {
      var currentValue = service.getCharacteristic(Characteristic.On).getValue();

      if (currentValue !== newValue) {
        log('Turn %s(%s) %s', config.name, config.ip, newValue ? "on" : "off");

        if (newValue) {
          wake();
          pinger.suspend(wakeGraceTime);
          log('Computer awake cycle started for %s(%s)', config.name, config.ip);
        } else {
          shutdown();
          pinger.suspend(shutdownGraceTime);
          log('Computer shutdown cycle started for %s(%s)', config.name, config.ip);
        }

        this.setOnline(newValue);
      }

      callback();
    }.bind(this));

  service.getCharacteristic(Characteristic.On)
    .on('get', function(callback) {
      var online = this.getOnline();
      callback(null, online);
    }.bind(this));

  function wake() {
    log('Attempting to wake %s(%s, %s)', config.name, config.ip, config.mac);
    self.setOnline(true);

    wol.wake(config.mac, function(error) {
      if (error)
        log('An error occured while waking %s(%s, %s): %s', config.name, config.ip, config.mac, error);
      self.setOnline(!error);
    });
  };

  function shutdown() {
    if (config.shutdownCommand) {
      log('Attempting to shut down %s(%s) using "%s"', config.name, config.ip, config.shutdownCommand);

      exec(config.shutdownCommand, function(error, stdout, stderr) {
        if(error)
          log('An error occured while trying to shut down %s(%s): %s', config.name, config.ip, error);
        self.setOnline(!error);
      });
    }
  }

  this.getServices = function() {
    return [service];
  };

  this.setOnline = function(newState) {
    var online = this.getOnline();
    if (newState !== online) {
      log('%s(%s) was just turned %s', config.name, config.ip, newState ? "on" : "off");
      isOnline = newState;
      service.getCharacteristic(Characteristic.On).getValue();
    }
  };

  this.getOnline = function() {
    return isOnline;
  };

  return this;
}


function Pinger(config, interval, callback, log) {
  var running = false,
    pingSession = ping.createSession(),
    pingTimer, resumeTimer;

  var log = log || function() {};

  function run() {
    if (running)
      return;

    running = true;
    pingSession.pingHost(config.ip, function(error) {
      callback(!error);
      running = false;
    });
  }

  return {
    start: function() {
      this.stop();
      log('Starting ping timer on %dms interval for %s(%s)', interval, config.name, config.ip);
      pingTimer = setInterval(run, interval);
      return this;
    },

    stop: function() {
      if (pingTimer) {
        log('Stopping the current ping timer for %s(%s)', config.name, config.ip);
        pingTimer = clearInterval(pingTimer);
      }

      return this;
    },

    suspend: function(until) {
      this.stop();

      if (resumeTimer) {
        log('Canceling currently running grace timer for %s(%s)', config.name, config.ip);
        resumeTimer = clearInterval(resumeTimer);
      }

      log('Setting grace timer for %s(%s) for %dms', config.name, config.ip, until);
      resumeTimer = setTimeout(this.start.bind(this), until);

      return this;
    }
  };
}
