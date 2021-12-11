import bodyParser from 'body-parser';
import crypto from 'crypto';
import express from 'express';
import client from './client';
import logger from './logger';

const cors = require('cors');
const config = require('../config.js');

// Create an in-memory cache of responses. These will get cleared once processed.
const responseCache = {};

// Start REST server
const app = express();
app.use(bodyParser.json());
app.use(cors());

//---------------------
// HELPERS
//---------------------

// Parse the request body for a payload
function getPayload(body) {
  if (body.data) {
    if (body.data.data) {
      return Buffer.from(body.data.data);
    }
    return Buffer.from(body.data);
  }
  return Buffer.from(body);
}

// Get the index of data in the internal cache given a Lattice and request id
function getCacheID(latticeId, requestId) {
  return `${latticeId}_${requestId}`;
}

// Subscribe to an internal response topic while we wait for the target Lattice to fill the request.
function subscribeToResponse(responseTopic) {
  client.subscribe(responseTopic, client.subOptions, (err, granted) => {
    if (err) {
      logger.error(`Unable to subscribe to internal topic ${responseTopic}: ${err.toString()}`);
      throw new Error(err);
    }
    if (granted) {
      logger.debug(`Subscribed to topic ${responseTopic}`);
    } else {
      logger.debug(`Failed to subscribe to internal topic ${responseTopic}`);
    }
  });
}

// Unsubscribe from internal response topic when we time out or get a response from the
// target Lattice.
function unsubscribeFromResponse(responseTopic) {
  client.unsubscribe(responseTopic, (err) => {
    if (err) {
      logger.error(`Unable to unsubscribe from topic ${responseTopic}: ${err.toString()}`);
      throw new Error(err);
    } else {
      logger.debug(`Unsubscribed from interal topic ${responseTopic}`);
    }
  });
}

// Subscribe to MQTT broker and await response from Lattice (or timeout) given
// a request ID.
function listenForResponse(res, serial, requestId) {
  const cacheID = getCacheID(serial, requestId);
  const responseTopic = `from_agent/${serial}/response/${requestId}`;
  try {
    subscribeToResponse(responseTopic);
  } catch (err) {
    res.send({ status: 500, message: 'Unable to subscribe to mqtt response topic' });
    return;
  }

  // Set a timer to wait for a response to the message sent to the agent
  // Activates a subscription during this time that will forward the return message back as
  // a response to the original request
  const totalTime = config.TIMEOUT_TOTAL_MS;
  const iteration = config.TIMEOUT_ITER_MS;
  let elapsed = 0;

  const interval = setInterval(() => {
    if (responseCache[cacheID] !== undefined) {
      // If the response has been recorded in our in-memory cache, we can unsubscribe
      // and respond back to the original requester.
      let toReturn;
      try {
        toReturn = responseCache[cacheID].toString('hex');
        res.send({ status: 200, message: toReturn });
        logger.debug(`Successfully responded to request for agent: ${serial} request: ${requestId}`);
      } catch (err) {
        logger.error(`Could not parse response from agent: ${serial} requestId: ${requestId}, error: ${err}`);
        res.send({ status: 500, message: 'Could not parse response from agent' });
      }
      // Clear this item from the cache and unsubscribe from the topic.
      responseCache[cacheID] = undefined;
      unsubscribeFromResponse(responseTopic);
      clearInterval(interval);
    } else {
      // If there is still no response, record the time and return timeout if we have reached
      // the timeout threshold.
      elapsed += iteration;
      if (elapsed >= totalTime) {
        res.send({ status: 500, message: `lattice-connector-endpoint timed out after waiting ${Math.ceil(totalTime / 1000)}s` });
        // Clear this item from the cache and unsubscribe from the topic.
        responseCache[cacheID] = undefined;
        unsubscribeFromResponse(responseTopic);
        clearInterval(interval);
      }
    }
  }, iteration);
}

//---------------------
// INTERNAL MQTT CLIENT
//---------------------

// Create a message handler for our internal MQTT client. This client only subscribes to ephemeral
// request response topics as it waits for the target Lattice(s) to fill requests
client.on('message', (topic, payload) => {
  try {
    const latticeId = topic.split('/')[1];
    const requestId = topic.split('/')[3];
    responseCache[getCacheID(latticeId, requestId)] = payload;
    logger.debug(`Added to internal responseCache (topic=${topic}, latticeId=${latticeId}, requestId=${requestId}): ${payload}`);
  } catch (err) {
    logger.error(`Failed to add response to internal cache (topic=${topic}): ${err.toString()}`);
  }
});

//---------------------
// API
//---------------------

// Pass a request body to the device with :latticeId identifier
// @param [latticeId]   - Device identifier of Lattice. This should be known to the end user.
// @param [req.body] - Data to be sent to the Lattice. Must be Array-like. May be of form
//                     [array] or {data: [array]}.
app.post('/:latticeId', (req, res) => {
  try {
    const payload = getPayload(req.body);
    const { latticeId } = req.params;
    const requestId = crypto.randomBytes(4).toString('hex');
    const requestTopic = `to_agent/${latticeId}/request/${requestId}`;
    client.publish(requestTopic, payload, client.pubOpts, (err) => {
      if (err) {
        logger.error(`Unable to publish message for ${latticeId}, mqtt possibly disconnecting`);
        res.send({ status: 500, message: 'Failed to send message to Lattice' });
      } else {
        logger.debug(`published message connect to ${requestTopic}`);
        listenForResponse(res, latticeId, requestId);
      }
    });
  } catch (err) {
    res.send({ status: 500, message: err.toString() });
  }
});

export default app;
