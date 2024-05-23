import { AccessoryConfig } from "homebridge";

import { NetworkDeviceLogLevel } from "./logging";

export class NetworkDeviceConfig {
  name = "My NetworkDevice";

  manufacturer = "homebridge-wol";
  model = "NetworkDevice";
  serialNumber: string;

  host: string | null = null;
  pingInterval = 2;
  pingsToChange = 5;
  pingTimeout = 1;
  pingCommand: string | null = null;
  pingCommandTimeout = 0;

  mac: string | null = null;
  port = 9;
  broadcastAddress: string | null = null;
  startCommand: string | null = null;
  startCommandTimeout = 0;
  wakeGraceTime = 45;
  wakeCommand: string | null = null;
  wakeCommandTimeout = 0;

  shutdownCommand: string | null = null;
  shutdownGraceTime = 15;
  shutdownCommandTimeout = 0;

  logLevel: NetworkDeviceLogLevel = NetworkDeviceLogLevel.Info;

  returnEarly = false;

  constructor(config: AccessoryConfig) {
    // WARNING!
    // This code might be dangerous, if you're going alone, please take this:
    //       /| _________________
    // O|===|* >________________/
    //       \|
    // Jokes aside, this code is really nasty. If you know of a better way
    // of solving it, please consider contributing:
    // https://github.com/AlexGustafsson/homebridge-wol#contribute

    this.name = this.getString(config, "name", this.name) as string;

    this.manufacturer = this.getString(
      config,
      "manufacturer",
      this.manufacturer
    ) as string;
    this.model = this.getString(config, "model", this.model) as string;
    this.serialNumber = this.getString(
      config,
      "serialNumber",
      new Array(4)
        .fill(null)
        .map((_) => Math.round(Math.random() * 1e5).toString())
        .join("-")
    ) as string;

    this.host = this.getString(config, "host", this.host);
    this.pingInterval =
      this.getNumber(config, "pingInterval", this.pingInterval) * 1000;
    this.pingsToChange = this.getNumber(
      config,
      "pingsToChange",
      this.pingsToChange
    );
    this.pingTimeout =
      this.getNumber(config, "pingTimeout", this.pingTimeout) * 1000;
    this.pingCommand = this.getString(config, "pingCommand", this.pingCommand);
    this.pingCommandTimeout =
      this.getNumber(config, "pingCommandTimeout", this.pingCommandTimeout) *
      1000;

    this.mac = this.getString(config, "mac", this.mac);
    this.port = this.getNumber(config, "port", this.port);
    this.broadcastAddress = this.getString(
      config,
      "broadcastAddress",
      this.broadcastAddress
    );
    this.startCommand = this.getString(
      config,
      "startCommand",
      this.startCommand
    );
    this.startCommandTimeout =
      this.getNumber(config, "startCommandTimeout", this.startCommandTimeout) *
      1000;
    this.wakeGraceTime =
      this.getNumber(config, "wakeGraceTime", this.wakeGraceTime) * 1000;
    this.wakeCommand = this.getString(config, "wakeCommand", this.wakeCommand);
    this.wakeCommandTimeout =
      this.getNumber(config, "wakeCommandTimeout", this.wakeCommandTimeout) *
      1000;

    this.shutdownCommand = this.getString(
      config,
      "shutdownCommand",
      this.shutdownCommand
    );
    this.shutdownGraceTime =
      this.getNumber(config, "shutdownGraceTime", this.shutdownGraceTime) *
      1000;
    this.shutdownCommandTimeout =
      this.getNumber(
        config,
        "shutdownCommandTimeout",
        this.shutdownCommandTimeout
      ) * 1000;

    this.logLevel = this.getLogLevel(config, "logLevel", this.logLevel);

    this.returnEarly = this.getBoolean(config, "returnEarly", this.returnEarly);
  }

  private getString(
    config: AccessoryConfig,
    key: string,
    defaultValue: string | null
  ): string | null {
    if (typeof config[key] === "undefined") return defaultValue;

    const type = typeof config[key];
    if (type !== "string")
      throw new Error(
        `Got incorrect value type for config key '${key}' expected string, got '${type}'`
      );

    return config[key] as string;
  }

  private getNumber(
    config: AccessoryConfig,
    key: string,
    defaultValue: number
  ): number {
    if (typeof config[key] === "undefined") return defaultValue;

    const type = typeof config[key];
    if (type !== "number")
      throw new Error(
        `Got incorrect value type for config key '${key}' expected number, got '${type}'`
      );

    return config[key] as number;
  }

  private getBoolean(
    config: AccessoryConfig,
    key: string,
    defaultValue: boolean
  ): boolean {
    if (typeof config[key] === "undefined") return defaultValue;

    const type = typeof config[key];
    if (type !== "boolean")
      throw new Error(
        `Got incorrect value type for config key '${key}' expected boolean, got '${type}'`
      );

    return config[key] as boolean;
  }

  private getLogLevel(
    config: AccessoryConfig,
    key: string,
    defaultValue: NetworkDeviceLogLevel
  ): NetworkDeviceLogLevel {
    if (typeof config[key] === "undefined") return defaultValue;

    const type = typeof config[key];
    if (type !== "string")
      throw new Error(
        `Got incorrect value type for config key '${key}' expected string, got '${type}'`
      );

    if (!Object.values(NetworkDeviceLogLevel).includes(config[key] as string))
      throw new Error(
        `Got incorrect log level for config key '${key}': '${config[key]}'`
      );

    return NetworkDeviceLogLevel[
      config[key] as keyof typeof NetworkDeviceLogLevel
    ];
  }
}
