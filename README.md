# lattice-connect
A small HTTP server + MQTT broker designed to communicate with [Lattice](https://gridplus.io/lattice) hardware wallets over the web.

## Background

The [Lattice](https://gridplus.io/lattice) is a next generation, always-online hardware wallet designed to sit behind a user's home WiFi network router. Since we cannot expect the average user to configure their home router, we expect default firewall settings that block incoming requests. For this reason, the Lattice is **not** designed to be contacted directly over HTTP. Instead, it uses a pub/sub model to subscribe to specific topics from an [MQTT](https://mqtt.org/) broker, which typically lives in the cloud (i.e. not behind a firewall). The Lattice subscribes topics containing its device ID. HTTP requests from third party applications must be transformed to MQTT messages and sent to the broker, where they are broadcast and picked up by the target Lattice (i.e. based on device ID).

By default, communication with all Lattices is routed through GridPlus' centralized cloud infrastructure. Although there is great care that goes into encrypting and securing these communication channels, we at GridPlus want your Lattice to be 100% yours, so we want to offer an alternative to centralized message routing. This module exists to bridge connections between target Lattices and web applications (generally, but not limited to, applications that use the [`gridplus-sdk`](https://github.com/GridPlus/gridplus-sdk)). If you are an advanced user, you can deploy this module yourself and change your Lattice's config to hook into your deployed instance.

#### HTTP and MQTT communications

Each Lattice subscribes to topics on an MQTT broker using its device ID. Web applications make HTTP requests to a web server, which converts the message to an MQTT topic and sends that to the broker. Once forwarded, the message is picked up by the target Lattice and the request is filled. 

This module contains both HTTP server and MQTT broker, so it can be used as a singular communication endpoint.

#### HTTP Endpoint

The HTTP webserver hosted from this module only contains one route:

**POST /:deviceID**

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

You can run this `node.js` module in a variety of ways. First, clone this repo and run 

```
npm i && npm run build
```

### Running Locally

You can run this module locally with one simple command:

```
npm start
```

This will create a [pm2](https://pm2.io/) process which will watch for crashes. See those docs for more info on pm2 itself.

You can stop the process at any point with:

```
npm run stop
```

And you can remove the running (or stopped) instance with:

```
npm run rm
```

### Running with Docker

You can also build and run this module locally with Docker:

```
npm run docker-build
npm run docker-run
```

### Deploying on Heroku

You can run this easily on heroku. Simply fork the repo and deploy from the `master` branch. The app should run with pm2 as if you had started it locally.

## Connecting your Lattice

If you want to point your Lattice to a deployed instance of this module, you will need to SSH into the device. On your Lattice's UI, go to `Settings -> Advanced -> Device Info` and look for the `SSH Host` and `SSH Password` parameters. SSH in:

```
ssh root@<SSH Host>.local
```

And use `SSH Password` to connect.

Once you are in the SSH terminal, you can check on your config:

```
uci show gridplus
```

You should see a line like the following:

```
gridplus.releaseCatalogURL=https://release-catalog-api.gridpl.us/update
```

> You may want to write down the original value of this so you can change it back if you want to go back to using GridPlus' default infrastructure.

You can now change this value with the following set of commands:

```
service gpd stop
service mosquitto stop
uci set gridplus.remote_mqtt_address=[deployed IP or host]:[BROKER_PORT]
uci commit
service mosquitto start
service gpd start
```

Where `deployed IP or host` is the location of your deployed instance of `lattice-connect` and `BROKER_PORT` refers to `MQTT.BROKER_PORT` in `config.js`, i.e. it is the *MQTT broker* port.


## Testing

This repo includes an integration test script that you can run to ensure your communication endpoint is functioning as expected.

**Step 1: Deploy locally**

The test should be run against a local instance. Deploy locally with one of the methods above (`npm start` or using Docker).

**Step 2: Point your Lattice your local broker**

Follow the instructions in the previous section to SSH into your Lattice and update `gridplus.remote_mqtt_address`.

**Step 3: Run test script**

Once your Lattice is pointed to the desired MQTT broker, it will listen to the correct topics and is ready for testing. You can run the tests with:

```
npm run test
```

This will kick off a few integration tests to validate that we are able to connect to the Lattice and get addresses. If these pass, it means the communication pathway is working as expected.
