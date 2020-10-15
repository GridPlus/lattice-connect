# lattice-connector-endpoint
A small HTTP server + MQTT broker designed to communicate with [Lattice](https://gridplus.io/lattice) hardware wallets over the web.

## Background

The [Lattice](https://gridplus.io/lattice) is a next generation, always-online hardware wallet designed to sit behind a consumer's home wifi network. Since we cannot expect the average user to configure their home router, the Lattice is **not** designed to be contacted directly over HTTP. This module exists to bridge connections between target Lattices and web applications (generally, but not limited to, applications that use the [`gridplus-sdk`](https://github.com/GridPlus/gridplus-sdk)).

## Lattice Communication Pathway

Each Lattice may subscribe to topics on one or more MQTT brokers, while web applications are meant to make HTTP requests. `lattice-connector-endpoint` contains an HTTP server and an MQTT broker. The following steps outline the process of establishing a connection between a given Lattice and a requester:

1. The Lattice must first subscribe to topic `to_agent/<deviceID>/request/<requestID>` on the MQTT broker. The topic must contain the Lattice's unique `deviceID`, which can be found on the main menu of the Lattice device's UI.
2. An external web application wishing to communicate with a known Lattice makes a request to the `lattice-connector-endpoint`'s REST HTTP server using its [POST route](/api-endpoints): `/:deviceID`
3. The HTTP server takes the message payload and uses a local MQTT client (connected to the same MQTT broker) to publish the payload using topic `to_agent/<deviceID>/request/<requestID>`. Because both MQTT clients (Lattice and HTTP server) are connected to the same MQTT broker, the message will make it to the target Lattice, which is subscribed to the above topic.
4. After publishing the previous message, the HTTP server tells its local MQTT client to subscribe to a matching "response topic": `from_agent/<deviceID>/response/<requestID>`. The HTTP server starts a timer (configurable in `config.js`) after which it unsubscribes from the topic. If a response comes through before the timeout expires, the server unsubscribes and returns the payload as an HTTP response to the original web requester. If there is a timeout, the HTTP server will return an error.

### Example Communication Pathway

The prototypical example would be a DeFi app that uses [Blocknative's `Onboard.js`](https://github.com/blocknative/onboard). In this case `Onboard.js` would use [`eth-lattice-keyring`](https://github.com/GridPlus/eth-lattice-keyring) to send requests to a specified Lattice via the [`gridplus-sdk`](https://github.com/GridPlus/gridplus-sdk), which communicates with our `lattice-connector-endpoint`.

The pathway would look like this:

**DeFi web app <> `Onboard.js` <> `eth-lattice-keyring` <> `gridplus-sdk` <> `lattice-connector-endpoint` <> target Lattice**

The application could also use the `gridplus-sdk` itself or contact `lattice-connector-endpoint` directly to reduce the call stack, but `Onboard.js` is a nice plug-and-play wallet connector that a lot of applications use.

## API Endpoints

The following endpoints are exposed by the HTTP server.

### POST /:deviceID

Contact a Lattice (given its `deviceID`) with a payload. The payload must be a `UInt8Array` or `Buffer` type. On a successful message, a hex string is returned. [`gridplus-sdk`](https://github.com/GridPlus/gridplus-sdk) will parse this data into an appropriate response, so using it is highly recommended.

**Request data**:

```
{
  data: <UInt8Array or Buffer>
}
```

**Response**:

```
{
  status: <Number> // 200 for success, 500 for internal error
  message: <String> // Hex string containing response payload (status=200) or error string (status=500)
}
```

## Installation and Usage

You can create your own connection endpoint using Docker. Convenience scripts are included in `package.json`:

```
npm run docker-build
npm run docker-run
```

You can then quickly test that it is running with `curl -X POST http://localhost/test`, which should immediately return a `500` error.

## Testing

This repo includes an integration test script that you can run to ensure your communication endpoint is functioning as expected.

**Step 1: Point your Lattice to the `lattice-connector-endpoint` MQTT broker**

You can test a `lattice-connector-endpoint` deployment by pointing your Lattice to the MQTT broker. 

Current Lattice versions (GCE <= 0.48.6&dagger;) will not allow you to change your MQTT broker endpoint unless you are running a debug version. **This will change in future versions.** For now, if you have a debug (i.e. not production) Lattice, you need to SSH into the GCE and do the following:

```
service gpd stop
service mosquitto stop
uci set gridplus.remote_mqtt_address=[your broker's local IP + port]
uci commit
service mosquitto start
service gpd start
```

> &dagger;You can find your version by going to `Settings -> Advanced -> Device Info` on your Lattice.

**Step 2: Run test script**

Once your Lattice is pointed to the local MQTT broker, it will listen to the correct topics and is ready for testing. You can run the tests with:

```
npm run test
```

This will kick off a few integration tests to validate that we are able to connect to the Lattice and get addresses. If these pass, it means the communication pathway is working as expected.
