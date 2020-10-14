// Create an internal MQTT client. This is used to communicate with the aedes broker in ./broker.js.
// and is used by the REST API in `./app.js` to converts messages between MQTT and HTTP.
import mqtt from 'mqtt';
import log from 'llog';

const config = require('cconfig')();

const connectOptions = {
  clientId: 'REST_API',
  username: config.MQTT_USERNAME,
  password: config.MQTT_PASSWORD,
};

const brokerURI = `mqtt://${config.host}:${config.mqttBrokerPort}`;
const client = mqtt.connect(brokerURI, connectOptions);

client.on('connect', () => {
  log.info(`Connected to MQTT Broker at ${brokerURI}`);
});

client.on('error', (error) => {
  log.error('Client failed to connect due to error:', error);
});

client.on('close', () => {
  log.error(`MQTT broker connection closed for ${connectOptions.clientId}`);
});

export const pubOptions = {
  qos: 1,
  retain: false,
  dup: false,
};

export const subObtions = {
  qos: 1,
};

export default client;
