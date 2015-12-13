'use strict';

const ip = require('ip');
const dnode = require('dnode');
const username = require('username');

module.exports = class Chat {

  constructor(options) {
    this.options = options || {};
    this.connections = {};
  }

  start(cb) {
    this._server = dnode({
      transform: s => {
        const msgObj = JSON.parse(s);
        if (msgObj.msg === 'ping') {
          return this.connectOne(msgObj.ip, true);
        }
        cb(msgObj);
      }
    });
    this._server.listen(this.options.port);

    this.connect();
  }

  connect() {
    const options = this.options;
    if (options.host) {
     return this.connectOne(options.host);
    }
    const lan = options.lan || ip.address().replace(/[^\.]+$/, '');
    for (let i = 1; i < 256; ++i) {
      dnode.connect({
        host: lan + i,
        port: options.port
      })
      .on('remote', remote => {
        this.connections[lan + i] = remote;
        this.ping(remote);
      })
      .on('error', e => console.error);
    }

    return this;
  }

  connectOne(host, notPing) {
    const options = this.options;
    dnode.connect({
      host: host,
      port: options.port
    })
    .on('remote', remote => {
      this.connections[host] = remote;
      if (!notPing) {

      this.ping(remote);
      }
    })
    .on('error', e => console.error);

    return this;
  }

  ping(remote) {
    const msgObj = {
      name: this.options.name || username.sync(),
      ip: ip.address(),
      msg: 'ping'
    };
    remote.transform(JSON.stringify(msgObj));

    return this;
  }

  send(msg) {
    msg = msg.trim();
    if (!msg) return;

    const msgObj = {
      name: this.options.name || username.sync(),
      ip: ip.address(),
      msg: msg
    };

    for (let host in this.connections) {
      if (process.env.DEBUG === 'test' || msgObj.ip !== host) {
        this.connections[host].transform(JSON.stringify(msgObj));
      }
    }
    return this;
  }
};
