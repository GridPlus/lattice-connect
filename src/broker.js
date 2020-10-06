// Create an aedes MQTT broker as part of this process. Lattices in the field should
// connect to this broker.
import log from 'llog';

const aedes = require('aedes')();
const net = require('net');

aedes.on('client', (_client) => {
  log.info(`BROKER: New client (${_client.id}) attempting connection.`);
});

aedes.on('clientReady', (_client) => {
  log.info(`BROKER: Client (${_client.id}) connected.`);
});

aedes.on('subscribe', (_subscriptions, _client) => {
  log.info(`BROKER: Client (${_client.id}) subscribed to topics: ${JSON.stringify(_subscriptions)}`);
});

// aedes.on('publish', (_packet, _client) => {
//   log.info(`BROKER: Client (${_client.id}) published message: ${_packet}`)
// })

const broker = net.createServer(aedes.handle);
export default broker;
