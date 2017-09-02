'use strict'

const dgram = require('dgram')
const IP = require('ip')

module.exports = class Chat {
  constructor ({ ip, port, subnetMask, username }) {
    this.ip = ip
    this.port = port
    this.username = username
    this.broadcastAddress = IP.subnet(ip, subnetMask).broadcastAddress
  }

  start (cb) {
    const server = dgram.createSocket('udp4')
    server.on('listening', () => {
      this.broadcast('online!')
    })
    server.on('message', (msg, rinfo) => {
      if (rinfo.address !== this.ip) {
        cb(JSON.parse(msg.toString()))
      }
    })
    server.bind(this.port)

    const client = dgram.createSocket('udp4')
    client.bind(() => {
      client.setBroadcast(true)
    })

    this._client = client
    this._server = server
  }

  stop () {
    this._server.close()
    this.broadcast('offline!')
  }

  broadcast (msg) {
    msg = msg.trim()
    if (!msg) return

    const msgInfo = {
      username: this.username,
      msg
    }
    this._client.send(JSON.stringify(msgInfo), this.port, this.broadcastAddress)
  }
}
