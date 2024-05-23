import {
  API,
  Service,
  Logger,
  AccessoryConfig,
  CharacteristicSetCallback,
  CharacteristicValue,
  CharacteristicGetCallback,
} from "homebridge";

import Pinger from "./pinger";
import { wake, wait, exec } from "./utilities";
import { NetworkDeviceConfig } from "./config";
import { NetworkDeviceLogger } from "./logging";

enum NetworkDeviceStatus {
  Online = "Online",
  Offline = "Offline",
  WakingUp = "WakingUp",
  ShuttingDown = "ShuttingDown",
}

/** NetworkDevice accessory, holds Switch service */
export default class NetworkDevice {
  private api: API;
  private log: NetworkDeviceLogger;
  private switchService: Service;
  private informationService: Service;

  config: NetworkDeviceConfig;
  status: NetworkDeviceStatus;
  pinger: Pinger | null = null;

  constructor(upstreamLog: Logger, config: AccessoryConfig, api: API) {
    this.api = api;
    this.log = new NetworkDeviceLogger(upstreamLog, "NetworkDevice");
    this.config = new NetworkDeviceConfig(config);
    this.log.level = this.config.logLevel;

    this.status = NetworkDeviceStatus.Offline;

    // Set up a homebridge switch service
    this.switchService = new this.api.hap.Service.Switch(this.config.name);
    this.switchService
      .getCharacteristic(this.api.hap.Characteristic.On)
      .on("set", this.setOnline.bind(this))
      .on("get", this.getOnline.bind(this));

    // Set up a homebridge accessory information service
    this.informationService = new this.api.hap.Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(
        this.api.hap.Characteristic.Manufacturer,
        this.config.manufacturer
      )
      .setCharacteristic(this.api.hap.Characteristic.Model, this.config.model)
      .setCharacteristic(
        this.api.hap.Characteristic.SerialNumber,
        this.config.serialNumber
      )
      .setCharacteristic(
        this.api.hap.Characteristic.FirmwareRevision,
        process.env["npm_package_version"] as string
      );

    if (this.config.host || this.config.pingCommand) {
      this.pinger = new Pinger(upstreamLog, this.config);
      this.pinger.on("stateChanged", this.stateChanged.bind(this));
      this.pinger.start();
    }
  }

  setStatus(newStatus: NetworkDeviceStatus): void {
    // Debouncing - only react to a change if it has actually changed
    if (newStatus !== this.status) {
      this.log.info(
        'Device went from status "%s" to "%s"',
        this.status,
        newStatus
      );

      this.status = newStatus;

      // Trigger change in homebridge
      this.switchService
        .getCharacteristic(this.api.hap.Characteristic.On)
        .updateValue(
          this.status === NetworkDeviceStatus.WakingUp ||
            this.status === NetworkDeviceStatus.Online
        );
    }
  }

  stateChanged(isOnline: boolean): void {
    this.log.debug(
      "Got state change from pinger: %s",
      isOnline ? "online" : "offline"
    );

    if (isOnline && this.status !== NetworkDeviceStatus.Online) {
      // The device has been turned on
      this.log.debug("The device is now accessible - assuming online");
      this.setStatus(NetworkDeviceStatus.Online);
    } else if (!isOnline && this.status !== NetworkDeviceStatus.Offline) {
      // The device has gone offline
      this.log.debug("The device is no longer accessible - assuming offline");
      this.setStatus(NetworkDeviceStatus.Offline);
    }
  }

  // Called by homebridge when a user "flicks the switch"
  async setOnline(
    newState: CharacteristicValue,
    callback: CharacteristicSetCallback
  ): Promise<void> {
    this.log.debug("Got user-triggered state change: %d", newState);

    // Don't allow user to change the state when waking up or shutting down
    if (
      this.status === NetworkDeviceStatus.WakingUp ||
      this.status === NetworkDeviceStatus.ShuttingDown
    )
      return callback();

    const isOnline = this.status === NetworkDeviceStatus.Online;
    // Homebridge provides its states as numbers (0 / 1)
    const shouldBeOnline = Boolean(newState);

    // Debouncing - no change is necessary if we're currently in the correct state
    if (shouldBeOnline === isOnline) return callback(null);

    if (shouldBeOnline) {
      this.log.info("Awake cycle started");

      // Conditionally wait for the wake cycle to complete to mitigate Siri issue
      // See https://github.com/AlexGustafsson/homebridge-wol/issues/85
      if (this.config.returnEarly) this.wake();
      else await this.wake();
    } else {
      this.log.info("Shutdown cycle started");

      // Conditionally wait for the wake cycle to complete to mitigate Siri issue
      // See https://github.com/AlexGustafsson/homebridge-wol/issues/85
      if (this.config.returnEarly) this.shutdown();
      else await this.shutdown();
    }

    callback(null);
  }

  // Called by homebridge when a device polls the status
  getOnline(callback: CharacteristicGetCallback): void {
    this.log.debug("Got state request - reporting %s", this.status);

    callback(
      null,
      this.status === NetworkDeviceStatus.Online ||
        this.status === NetworkDeviceStatus.WakingUp
    );
  }

  async wake(): Promise<void> {
    this.log.info("Attempting to wake up device");

    this.setStatus(NetworkDeviceStatus.WakingUp);

    // Disable the pinger
    if (this.pinger) this.pinger.stop();

    let woke = false;

    // Wake up using WoL if available
    if (this.config.mac) {
      this.log.debug("Attempting to start device by sending a WoL packet");

      try {
        await wake(this.config.mac, {
          address: this.config.broadcastAddress as string | undefined,
          port: this.config.port
        });
      } catch (error) {
        this.log.error(
          "An error occurred while trying to start the device using WoL"
        );
        this.log.debug(`${error}`);
      }

      woke = true;
    }

    if (this.config.startCommand) {
      const commandName = this.config.startCommand.split(" ")[0];
      this.log.info(
        'Attempting to start the device using command "%s"',
        commandName
      );

      try {
        await exec(this.config.startCommand, {
          timeout: this.config.startCommandTimeout,
        });
      } catch (error) {
        this.log.error(
          "HWOL-4001 An error occurred while trying to start the device. This is most likely not an issue with homebridge-wol itself. For more information see https://github.com/AlexGustafsson/homebridge-wol/wiki/Frequently-Asked-Questions#hwol-4001"
        );
        this.log.debug(error);
      }

      woke = true;
    }

    if (woke) {
      this.log.info(
        "Waiting for wake grace time (%dms)",
        this.config.wakeGraceTime
      );
      await wait(this.config.wakeGraceTime);
    }

    // Wake up using a wake command if available
    if (woke && this.config.wakeCommand) {
      const commandName = this.config.wakeCommand.split(" ")[0];
      this.log.info('Attempting to wake up the device using "%s"', commandName);

      try {
        await exec(this.config.wakeCommand, {
          timeout: this.config.wakeCommandTimeout,
        });
      } catch (error) {
        this.log.error(
          "HWOL-4001 An error occurred while trying to wake the device. This is most likely not an issue with homebridge-wol itself. For more information see https://github.com/AlexGustafsson/homebridge-wol/wiki/Frequently-Asked-Questions#hwol-4001"
        );
        this.log.debug(error);
      }
    }

    if (!woke) {
      this.log.warn("No way of waking the device was configured");
      this.setStatus(NetworkDeviceStatus.Offline);
    }

    if (this.pinger) this.pinger.start();
  }

  async shutdown(): Promise<void> {
    this.setStatus(NetworkDeviceStatus.ShuttingDown);

    // Disable the pinger
    if (this.pinger) this.pinger.stop();

    let shutDown = false;

    if (this.config.shutdownCommand) {
      const commandName = this.config.shutdownCommand.split(" ")[0];
      this.log.info(
        'Attempting to shut down the device using "%s"',
        commandName
      );

      try {
        await exec(this.config.shutdownCommand, {
          timeout: this.config.shutdownCommandTimeout,
        });
      } catch (error) {
        this.log.error(
          "HWOL-4001 An error occurred while trying to shut down the device. This is most likely not an issue with homebridge-wol itself. For more information see https://github.com/AlexGustafsson/homebridge-wol/wiki/Frequently-Asked-Questions#hwol-4001"
        );
        this.log.debug(error);
      }

      shutDown = true;
    }

    if (shutDown) {
      this.log.info(
        "Waiting for shutdown grace time (%dms)",
        this.config.shutdownGraceTime
      );
      await wait(this.config.shutdownGraceTime);
    } else {
      this.log.warn("No way of shutting down the device was configured");
      this.setStatus(NetworkDeviceStatus.Online);
    }

    if (this.pinger) this.pinger.start();
  }

  // Called by homebridge to retrieve available services
  getServices(): Service[] {
    return [this.switchService, this.informationService];
  }
}
