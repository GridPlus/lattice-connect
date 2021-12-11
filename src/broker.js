// Create an aedes MQTT broker as part of this process. Lattices in the field should
// connect to this broker.
import logger from './logger';

const aedes = require('aedes');
const net = require('net');

const instance = aedes();
let connCount = 0;

instance.on('client', (_client) => {
  logger.debug(`BROKER (conns=${connCount}): New client (${_client.id}) attempting connection.`);
});

instance.on('clientReady', (_client) => {
  connCount += 1;
  logger.info(`BROKER (conns=${connCount}): Client (${_client.id}) connected.`);
});

instance.on('clientError', (_client, error) => {
  logger.error(`BROKER (conns=${connCount}): Error from client ${_client.id}: ${error.message}`);
});

instance.on('subscribe', (_subscriptions, _client) => {
  logger.debug(`BROKER (conns=${connCount}): Client (${_client.id}) subscribed to topics: ${JSON.stringify(_subscriptions)}`);
});

instance.on('publish', (_packet, _client) => {
  logger.trace(`BROKER (conns=${connCount}): Client (${_client}) published message: ${JSON.stringify(_packet)}`);
});

const broker = net.createServer(instance.handle);
export default broker;
