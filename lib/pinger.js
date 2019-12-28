const EventEmitter = require('events');
const {promisify} = require('util');
const exec = promisify(require('child_process').exec);

const ping = require('ping');

class Pinger extends EventEmitter {
  constructor(log, pingLog, debugLog, config) {
    super();

    this.config = config;

    this.log = log;
    this.pingLog = pingLog;
    this.debugLog = debugLog;

    this.timer = null;

    this.history = [];
  }

  // Returns true or false depending on host state (true is up, false is down)
  async executePingCommand() {
    const commandName = this.config.pingCommand.split(' ')[0];
    this.debugLog('Attempting to poll state of "%s" (%s) using "%s"', this.config.name, this.config.ip || 'unknown ip', commandName);

    try {
      await exec(this.config.pingCommand);
      this.debugLog('Result of executing ping command for "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', 'online');
      // If there is no error, the host is considered up
      return true;
    } catch {
      this.debugLog('Result of executing ping command for "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', 'offline');
      // If there is an error, the host is considered down
      return false;
    }
  }

  async ping() {
    this.debugLog('Attempting to ping "%s" (%s)', this.config.name, this.config.ip || 'unknown ip');

    // Timeout is given in seconds
    const response = await ping.promise.probe(this.config.ip, {timeout: this.config.timeout / 1000});
    this.debugLog('Result of pinging "%s" (%s): %s', this.config.name, this.config.ip || 'unknown ip', response.alive ? 'online' : 'offline');
    return response.alive;
  }

  async pollState(immediate) {
    let isOnline = null;
    if (this.config.pingCommand)
      isOnline = await this.executePingCommand();
    else
      isOnline = await this.ping();

    this.history.push(isOnline);

    // If there are not enough measurements yet, return prematurely
    if (!immediate && this.history.length < this.config.pingsToChange)
      return;

    const positives = this.history.reduce((positives, isPositive) => isPositive ? positives + 1 : positives, 0);
    this.debugLog('Got %d positives out of %d', positives, this.history.length);
    // Only change state if all measurements are the same
    if (positives === this.history.length)
      this.emit('stateChanged', true);
    else if (positives === 0)
      this.emit('stateChanged', false);

    this.history = [];
  }

  stop() {
    this.debugLog('Stopping pinger');
    clearInterval(this.timer);
    this.history = [];
  }

  async start() {
    this.stop();
    this.debugLog('Starting pinger at an interval of %d milliseconds', this.config.pingInterval);

    // Poll once immediately
    await this.pollState(true);

    // Start polling indefinately
    this.timer = setInterval(() => {
      this.pollState();
    }, this.config.pingInterval);
  }
}

module.exports = Pinger;
