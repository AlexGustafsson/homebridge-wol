'use strict';

const ping = require('ping');

class Pinger {
  constructor(log, config, callback) {
    this.config = config;
    this.log = log;

    this.callback = callback;

    this.pingTimer = null;
    this.waitTimer = null;
    this.pinging = false;
  }

  ping() {
    if (!this.pinging) {
      this.pinging = true;
      ping.promise.probe(this.config.ip, {timeout: 200})
        .then(response => {
          this.pinging = false;
          this.callback(response.alive);
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
