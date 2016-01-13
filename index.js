"use strict";

//Require the wake on lan utility package
var wol = require("wake_on_lan");

//Require the net ping utility package
var ping = require("net-ping");

var Service, Characteristic;

//Export homebridge plugin
module.exports = function(homebridge) {

  //Determine the service - part of the homebridge plugin ecosystem
  Service = homebridge.hap.Service;

  //Determine charachteristics (i.e. switch, lamp etc.) - part of the homebridge plugin ecosystem
  Characteristic = homebridge.hap.Characteristic;

  //Register the plugin as an accessory "Computer" of type Computer - part of the homebridge plugin ecosystem
  homebridge.registerAccessory("homebridge-wol", "Computer", Computer);
}

//Computer class
function Computer(log, config) {
  //The log to which the plugin writes debug messages - part of homebridge plugin ecosystem
  this.log = log;

  //The name of the computer, used for ease of access as well as Siri implementations
  this.name = config.name;

  //The mac address of the computer, used to create a "magic package" for WoL
  this.mac = config.mac;

  //The ip address of the computer, used to ping the machine to check if it's turned on or not. Currently only supports ipv4
  this.ip = config.ip;

  //Create a session which can be used to ping the device - part of the net-ping package
  if(this.ip)
    this._session = ping.createSession();

  //Make the computer a "switch" which can be on or off - part of the homebridge plugin ecosystem
  this._service = new Service.Switch(this.name);
  //Handle what happens when the switch is supposed to be turned on
  this._service.getCharacteristic(Characteristic.On).on('set', this._setOn.bind(this));

  //Wait 30 seconds before starting to check the computer
  setTimeout(function() {
    this.startChecking();
  }.bind(this), 30 * 1000);
}

//Function to retrieve the services that the plugin is capabel of - part of the homebridge plugin ecosystem
Computer.prototype.getServices = function() {
  return [this._service];
}

//Function which handles what happens when the switch is supposed to be turned on
Computer.prototype._setOn = function(on, callback) {
  //If the new state is 'on'
  if(on){
    //Send magic packages to the computer
    wol.wake(this.mac, function(error) {
      //If an error occured when sending the packages
      if (error) {
        //Turn the switch off
        this._service.setCharacteristic(Characteristic.On, false);
        //Log error
        this.log("Error when sending packets", error);
      } else {
        //Log that the packets were sent
        this.log("Packets sent");
      }
    }.bind(this));
  }

  //Tell homebridge that the plugin is done progressing the event
  callback();
}

//Function to start checking whether the device is up or not
Computer.prototype.startChecking = function() {
  //Check to see if there is an ip configured
  if(this.ip){
    //Define a "timer"
    var stateTimer = null;

    //Define how often the computer's status should be logged (the default, 5, means every 5th minute)
    var logInterval = 5;
    //The current number (step) of sequential checks
    var currentStep = 1;
    //Whether or not the status should be logged
    var shouldLog = false;

    //Define how many failed checks is tolerated before switching the switch off
    var maxAttempts = 2;
    //The current number of sequential failed checks
    var failedAttempts = 0;

    //Start the timer which checks the computer every 30 seconds
    stateTimer = setInterval(function() {
      //Up currentStep by one
      currentStep++;

      //Check if the step has surpassed the wanted log interval
      if(currentStep >= logInterval){
        //Tell the state checker to log
        log = true;
        //Reset the number of checks
        currentStep = 1;
      } else {
        //Don't log
        log = false;
      }

      //Check the current state of the computer
      this.checkState(shouldLog, function(pingError) {
        //Check if there was an error (the computer was unreachable)
        if(pingError){
          //Up failedAttempts by one
          failedAttempts++;

          //Check if the amount of failed attempts is untolerated
          if(failedAttempts >= maxAttempts){
            //Reset the failed attempts
            failedAttempts = 0;

            //Log the event
            this.log("The computer is most likely off - switching off");

            //Turn the switch off
            this._service.setCharacteristic(Characteristic.On, false);
          }
        }
      }.bind(this));
    }).bind(this), 30 * 1000);
  } else {
    //Wait 30 seconds to give the computer some time
    setTimeout(function() {
      //Turn the switch off
      this._service.setCharacteristic(Characteristic.On, false);
    }.bind(this), 30 * 1000);
  }
}

//Function that checks the computer to see if it's turned on
Computer.prototype.checkState = function(shouldLog, callback) {
  //Ping the computer
  this.session.pingHost(this.ip, function(error){
    //If an error occured when checking the machine's current state
    if(error){
      //If the computer is not awake
      if(error instanceof ping.RequestTimedOutError) {
        //Tell the calling method that the device is unreachable
        callback(error);

        //Log that the computer is no longer active
        this.log("The computer " + this.ip + " is no longer active");
      } else {
        //Tell the calling method that an error occured
        callback(error);

        //Log the error
        this.log(JSON.stringify(error));
      }
    } else {
      //Tell the calling method that the computer is turned on
      callback(null);

      //Check to see if the event should be logged
      if(shouldLog)
        this.log("The computer " + this.ip + " is active");
    }
  }.bind(this));
}
