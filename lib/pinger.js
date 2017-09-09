'use strict';

const ping = require('ping');

const NUMBER_OF_PINGS = 5;

class Pinger {
  constructor(log, config, callback) {
    this.config = config;
    this.log = log;

    this.callback = callback;

    this.pingTimer = null;
    this.waitTimer = null;
    this.pinging = false;

    this.history = [];
  }

  ping() {
    if (!this.pinging) {
      this.pinging = true;
      ping.promise.probe(this.config.ip, {timeout: 200})
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
            this.callback(true);
          else if (positives === 0)
            this.callback(false);
        }).catch(() => {
          this.pinging = false;
        });
    }
  }

  wait(time) {
    this.stop();
    if (this.waitTimer)
      this.waitTimer = clearTimeout(this.waitTimer);
    this.waitTimer = setTimeout(this.start.bind(this), time);
  }

  stop() {
    if (this.timer)
      this.timer = clearInterval(this.timer);
  }

  start() {
    if (this.waitTimer)
      this.waitTimer = clearTimeout(this.waitTimer);
    if (!this.timer)
      this.timer = setInterval(this.ping.bind(this), this.config.pingInterval);
  }
}

module.exports = Pinger;
