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
import util from 'util';
import app from './app';
import broker from './broker';
import logger from './logger';

const config = require('cconfig')();
const packageJson = require('../package.json');

logger.info(`${packageJson.name} version ${packageJson.version} starting`);

// Error handlers
//-----------------------------------
process.on('uncaughtException', (err) => {
  broker.close(() => { logger.info('Closed broker') });
  logger.error('uncaughtException: ', err);
  logger.error(err.stack);
  throw err;
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${util.inspect(promise)} reason: ${reason}`);
  logger.error(reason);
  throw new Error(`Unhandled Rejection at: ${util.inspect(promise)} reason: ${reason}`);
});

// 1. Create the MQTT broker (server)
//----------------------------------
function startBroker() {
  logger.info('Starting broker', broker)
  broker.listen(config.MQTT.BROKER_PORT, () => {
    logger.info('MQTT broker server started on port ', config.MQTT.BROKER_PORT);
  });
}
logger.info('broker?', broker);
if (broker.closed === false) {
  broker.close(() => {
    logger.info('closed?');
    startBroker();
  });
} else {
  logger.info('Starting now');
  startBroker();
}


// 2. Create the REST server
//----------------------------------
logger.info('app', app)
app.listen(config.APP_PORT, config.APP_HOST, () => {
  logger.info(`signing-api-proxy started listening on ${config.APP_PORT}`);
});
