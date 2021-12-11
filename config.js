const fs = require('fs');

const LOCAL_CONFIG_PATH = './.config.json';

module.exports = {
  APP_HOST: '0.0.0.0',
  APP_PORT: 3000,
  LOG_DEST: '/tmp/lattice-connector.log',
  LOG_LEVEL: 'error', // trace, debug, info, warn, error
  MQTT_CLIENT_ID: 'lattice-connector-endpoint',
  MQTT_USERNAME: 'connector',
  MQTT_PASSWORD: 'connectorpasswordpleasechangeme',
  MQTT_BROKER_PORT: 1883,
  TIMEOUT_ITER_MS: 500,
  TIMEOUT_TOTAL_MS: 60000,
};
if (fs.existsSync(LOCAL_CONFIG_PATH)) {
  const local = require(LOCAL_CONFIG_PATH);
  Object.keys(local).forEach((key) => {
    module.exports[key] = local[key];
  });
}
