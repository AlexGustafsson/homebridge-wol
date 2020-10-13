import {Logger} from "homebridge";

export enum NetworkDeviceLogLevel {
  Debug = 7,
  Info = 6,
  Notice = 5,
  Warning = 4,
  Error = 3,
  Critical = 2,
  Alert = 1,
  Emergency = 0,
  None = -1
}

export class NetworkDeviceLogger {
  upstream: Logger
  namespace: string

  level: NetworkDeviceLogLevel = NetworkDeviceLogLevel.Info;

  constructor(upstream: Logger, namespace: string) {
    this.upstream = upstream;
    this.namespace = namespace;
  }

  debug(message: string, ...parameters: any[]): void {
    // Use info instead of debug to control the level here instead of letting
    // homebridge take care of it - allows for it to be easily configured
    // per accessory
    if (this.level >= NetworkDeviceLogLevel.Debug)
      this.upstream.info(`[${this.namespace}] ${message}`, ...parameters);
  }

  info(message: string, ...parameters: any[]): void {
    if (this.level >= NetworkDeviceLogLevel.Info)
      this.upstream.info(`[${this.namespace}] ${message}`, ...parameters);
  }

  warn(message: string, ...parameters: any[]): void {
    if (this.level >= NetworkDeviceLogLevel.Warning)
      this.upstream.warn(`[${this.namespace}] ${message}`, ...parameters);
  }

  error(message: string, ...parameters: any[]): void {
    if (this.level >= NetworkDeviceLogLevel.Error)
      this.upstream.error(`[${this.namespace}] ${message}`, ...parameters);
  }
}
