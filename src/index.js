// Lattice messaging service. This service contains three components:
// 1. REST HTTP API (./app.js) -  allows external applications to make requests to a target Lattice,
//                                which typically sits behind a customer's home WiFi firewall.
// 2. MQTT client (./client.js) - an internal MQTT client that is used by the REST API, which cannot
//                                itself communicate directly with Lattices. This MQTT client can
//                                take requests and put them into the MQTT pipeline where they will
//                                reach the Lattice.
// 2. MQTT Broker (./broker.js) - an aedes server which handles connections of both Lattices that
//                                subscribe to this service and the inernal MQTT client in
//                                `./client.js`. This broker is the crux of this servce, as it
//                                allows Lattices to accept external requests from the internet
//                                using the MQTT pub/sub architecture.
import log from 'llog';
import util from 'util';
import app from './app';
import broker from './broker';

const config = require('cconfig')();
const packageJson = require('../package.json');

// Error handlers
//-----------------------------------
process.on('uncaughtException', (err) => {
  log.fatal(err);
  log.fatal(err.stack);
  throw err;
});

process.on('unhandledRejection', (reason, promise) => {
  log.fatal(`Unhandled Rejection at: ${util.inspect(promise)} reason: ${reason}`);
  log.fatal(reason);
  throw new Error(`Unhandled Rejection at: ${util.inspect(promise)} reason: ${reason}`);
});
log.info(`${packageJson.name} version ${packageJson.version} starting`);

// 1. Create the MQTT broker (server)
//----------------------------------
broker.listen(config.mqttBrokerPort, () => {
  log.info('broker server started on port ', config.mqttBrokerPort);
});

// 2. Create the REST server
//----------------------------------
app.listen(config.appPort, () => {
  log.info('signing-api-proxy started listening');
});
