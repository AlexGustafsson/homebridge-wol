const ping = require('ping');

const NUMBER_OF_PINGS = 5;

class Pinger {
  constructor(log, config, callback) {
    this.config = config;
    this.log = log;

    this.callback = callback;
    // Dummy function to handle callbacks whenever the pinger is not enabled,
    // but some pings may still call back due to concurrency
    this.pingCallback = () => {};

    this.pingTimer = null;
    this.waitTimer = null;
    this.pinging = false;

    this.history = [];
  }

  pingImmediate() {
    // timeout is given in seconds
    ping.promise.probe(this.config.ip, {timeout: this.config.timeout / 1000})
      .then(response => {
        this.pingCallback(response.alive);
      });
  }

  ping() {
    if (!this.pinging) {
      this.pinging = true;
      ping.promise.probe(this.config.ip, {timeout: this.config.timeout / 1000, extra: ['-R'],})
        .then(response => {
          this.pinging = false;

          this.history.push(response.alive);
          if (this.history.length > NUMBER_OF_PINGS)
            this.history.shift();

          let positives = this.history.reduce((count, alive) => {
            return alive ? count + 1 : count;
          }, 0);

          // Assume all are negative if there are no positives
          if (positives === this.history.length)
            this.pingCallback(true);
          else if (positives === 0)
            this.pingCallback(false);
        }).catch(() => {
          this.pinging = false;
        });
    }
  }

  wait(time) {
    this.stop();
    this.log('Starting pinger again in %d milli seconds', time);
    this.waitTimer = setTimeout(this.start.bind(this), time);
  }

  stop() {
    this.log('Stopping pinger');
    if (this.waitTimer)
      this.waitTimer = clearTimeout(this.waitTimer);
    if (this.timer)
      this.timer = clearInterval(this.timer);
    this.pingCallback = () => {};
  }

  start() {
    this.stop();
    this.log('Starting pinger at an interval of %d milli seconds', this.config.pingInterval);
    this.timer = setInterval(this.ping.bind(this), this.config.pingInterval);
    this.pingCallback = this.callback;

    this.pingImmediate();
  }
}

module.exports = Pinger;
