// Create an aedes MQTT broker as part of this process. Lattices in the field should
// connect to this broker.
import logger from './logger';

const aedes = require('aedes');
const fs = require('fs');
const net = require('net');
const tls = require('tls');
const config = require('../config.js');

const instance = aedes();
let connCount = 0;

instance.on('client', (client) => {
  logger.debug(`BROKER (conns=${connCount}): New client (${client.id}) attempting connection.`);
});

instance.on('clientReady', (client) => {
  connCount += 1;
  logger.info(`BROKER (conns=${connCount}): Client (${client.id}) connected.`);
});

instance.on('clientDisconnect', (client) => {
  connCount -= 1;
  logger.info(`BROKER (conns=${connCount}): Client (${client.id}) disconnected.`);
});

instance.on('clientError', (client, error) => {
  logger.error(`BROKER (conns=${connCount}): Error from client ${client.id}: ${error.message}`);
});

instance.on('subscribe', (_subscriptions, client) => {
  logger.debug(`BROKER (conns=${connCount}): Client (${client.id}) subscribed to topics: ${JSON.stringify(_subscriptions)}`);
});

instance.on('publish', (_packet, client) => {
  logger.trace(`BROKER (conns=${connCount}): Client (${client}) published message: ${JSON.stringify(_packet)}`);
});

let tlsBroker;
let netBroker;
if (config.keyPath && config.certPath) {
  const key = fs.readFileSync(config.keyPath);
  const cert = fs.readFileSync(config.certPath);
  tlsBroker = tls.createServer({ key, cert }, instance.handle);
} else {
  netBroker = net.createServer(instance.handle);
}

const broker = tlsBroker || netBroker;
export default broker;
