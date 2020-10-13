import {EventEmitter} from "events";

import * as ping from "ping";
import {Logger} from "homebridge";

import {exec} from "./utilities";
import {NetworkDeviceConfig} from "./config";
import {NetworkDeviceLogger} from "./logging";

export default class Pinger extends EventEmitter {
  private log: NetworkDeviceLogger
  private timer: NodeJS.Timeout | null = null;
  private history: boolean[] = [];

  config: NetworkDeviceConfig

  constructor(upstreamLog: Logger, config: NetworkDeviceConfig) {
    super();

    this.log = new NetworkDeviceLogger(upstreamLog, "Pinger");
    this.config = config;
    this.log.level = this.config.logLevel;
  }

  /** Returns whether or not the target is considered alive. */
  async executePingCommand(): Promise<boolean> {
    if (!this.config.pingCommand)
      throw new Error("Cannot execute ping command - no command configured");

    const commandName = this.config.pingCommand.split(" ")[0];
    this.log.debug("Attempting to poll state using \"%s\"", commandName);

    try {
      await exec(this.config.pingCommand, {timeout: this.config.pingCommandTimeout});
      this.log.debug("Result of executing ping command: online");
      // If there is no error, the host is considered up
      return true;
    } catch (error) {
      this.log.debug("Result of executing ping command: offline");
      this.log.debug(error);
      // If there is an error, the host is considered down
      return false;
    }
  }

  /** Ping once. Returns whether or not the target is considered alive. */
  async ping(): Promise<boolean> {
    if (!this.config.host)
      throw new Error("Cannot execute native ping - no host configured");

    this.log.debug("Attempting to ping host '%s'", this.config.host);

    // The timeout used by the ping library is in seconds
    const response = await ping.promise.probe(this.config.host, {timeout: this.config.pingTimeout / 1000});
    this.log.debug("Result of pinging: %s", response.alive ? "online" : "offline");
    return response.alive;
  }

  /**
  * Poll the state of the target once.
  * @param immediate Whether or not to return the current state. Uses a buffer otherwise.
  */
  async pollState(immediate: boolean = false): Promise<void> {
    // Trust the ping command to return a true state
    if (this.config.pingCommand) {
      const isOnline = await this.executePingCommand();
      this.emit("stateChanged", isOnline);
      return;
    }

    // Use history for pinging, since it may be unreliable
    const isOnline = await this.ping();
    this.history.push(isOnline);

    // If there are not enough measurements yet, return prematurely
    if (!immediate && this.history.length < this.config.pingsToChange)
      return;

    const positives = this.history.reduce((positives, isPositive) => isPositive ? positives + 1 : positives, 0);
    this.log.debug("Got %d positives out of %d", positives, this.history.length);
    // Only change state if all measurements are the same
    if (positives === this.history.length)
      this.emit("stateChanged", true);
    else if (positives === 0)
      this.emit("stateChanged", false);

    this.history = [];
  }

  /** Start polling the target's state. */
  async start(): Promise<void> {
    this.stop();
    this.log.debug("Starting pinger at an interval of %d milliseconds", this.config.pingInterval);

    // Poll once immediately
    await this.pollState(true);

    // Start polling indefinitely
    this.timer = setInterval(() => {
      this.pollState();
    }, this.config.pingInterval);
  }

  /** Stop polling the target's state. */
  stop(): void {
    this.log.debug("Stopping pinger");
    if (this.timer)
      clearInterval(this.timer);
    this.history = [];
  }
}
