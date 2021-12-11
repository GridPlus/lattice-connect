const local = require('./.config.json');

module.exports = {
  APP_HOST: local.APP_HOST || '0.0.0.0',
  APP_PORT: local.APP_PORT || 3000,
  LOG_DEST: local.LOG_DEST || '/tmp/lattice-connector.log',
  LOG_LEVEL: local.LOG_LEVEL || 'error', // trace, debug, info, warn, error
  MQTT_CLIENT_ID: local.MQTT_CLIENT_ID || 'lattice-connector-endpoint',
  MQTT_USERNAME: local.MQTT_USERNAME || 'connector',
  MQTT_PASSWORD: local.MQTT_PASSWORD || 'connectorpasswordpleasechangeme',
  MQTT_BROKER_PORT: local.MQTT_BROKER_POR || 1883,
  TIMEOUT_ITER_MS: local.TIMEOUT_ITER_MSG || 500,
  TIMEOUT_TOTAL_MS: local.TIMEOUT_TOTAL_MSG || 60000,
};
