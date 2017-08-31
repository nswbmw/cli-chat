'use strict'

const dnode = require('dnode')

module.exports = class Chat {
  constructor (options) {
    this.options = options
    this.connections = {}
  }

  start (cb) {
    this._server = dnode({
      transform: (s) => {
        const msgObj = JSON.parse(s)
        if (msgObj.msg === 'online') {
          msgObj.msg = '上线啦!'
          cb(msgObj)
          return this.connectOne(msgObj.ip, false)
        } else if (msgObj.msg === 'offline') {
          msgObj.msg = '下线啦!'
          cb(msgObj)
          return this.disconnectOne(msgObj.ip)
        }
        if (msgObj.ip in this.connections) {
          cb(msgObj)
        }
      }
    })
    this._server.listen(this.options.port)
    this.connect()
  }

  stop () {
    this.broadcast('offline')
    this._server.end()
  }

  connect () {
    const options = this.options
    if (options.host) {
      return this.connectOne(options.host)
    }
    for (let i = 0; i < 256; ++i) {
      const host = options.lan + i
      if (host !== options.ip) {
        this.connectOne(host)
      }
    }
  }

  connectOne (host, ping = true) {
    const options = this.options
    const connection = dnode.connect({
      host,
      port: options.port
    })
      .on('remote', (remote) => {
        this.connections[host] = connection
        if (ping) {
          this._ping(remote)
        }
      })
      .on('error', console.error)
  }

  disconnectOne (host) {
    this.connections[host] && this.connections[host].end()
    delete this.connections[host]
  }

  _ping (remote) {
    const options = this.options
    const msgObj = {
      username: options.username,
      ip: options.ip,
      msg: 'online'
    }
    remote.transform(JSON.stringify(msgObj))
  }

  broadcast (msg) {
    const options = this.options
    msg = msg.trim()
    if (!msg) return

    const msgObj = {
      username: options.username,
      ip: options.ip,
      msg
    }
    for (let host in this.connections) {
      const connection = this.connections[host]
      connection.proto && connection.proto.remote.transform(JSON.stringify(msgObj))
    }
  }
}
