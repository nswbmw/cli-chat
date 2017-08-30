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
        if (msgObj.msg === 'ping') {
          msgObj.msg = '上线啦!'
          cb(msgObj)
          return this.connectOne(msgObj.ip)
        } else if (msgObj.msg === 'off') {
          msgObj.msg = '下线啦!'
          cb(msgObj)
          return this.disconnectOne(msgObj.ip)
        }
        cb(msgObj)
      }
    })
    this._server.listen(this.options.port)
    this.connect()
  }

  stop () {
    this.broadcast('off')
  }

  connect () {
    const options = this.options
    if (options.host) {
      return this.connectOne(options.host, true)
    }
    for (let i = 0; i < 256; ++i) {
      const host = options.lan + i
      if (host !== options.ip) {
        this.connectOne(host, true)
      }
    }

    return this
  }

  connectOne (host, ping = false) {
    const options = this.options
    dnode.connect({
      host,
      port: options.port
    })
      .on('remote', (remote) => {
        this.connections[host] = remote
        if (ping) {
          this.ping(remote)
        }
      })
      .on('error', (e) => console.error)

    return this
  }

  disconnectOne (host) {
    delete this.connections[host]
  }

  ping (remote) {
    const options = this.options
    const msgObj = {
      username: options.username,
      ip: options.ip,
      msg: 'ping'
    }
    remote.transform(JSON.stringify(msgObj))

    return this
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
      this.connections[host].transform(JSON.stringify(msgObj))
    }
    return this
  }
}
