module.exports = {
  APP_HOST: '0.0.0.0',
  APP_PORT: 3000,
  LOG_DEST: 'lattice-connector.log',
  LOG_LEVEL: 'error', // trace, debug, info, warn, error
  MQTT: {
    CLIENT_ID: 'lattice-connector-endpoint',
    USERNAME: 'connector',
    PASSWORD: 'connectorpasswordpleasechangeme',
    BROKER_PORT: 1883,
  },
  TIMEOUT_ITER_MS: 500,
  TIMEOUT_TOTAL_MS: 60000,
}