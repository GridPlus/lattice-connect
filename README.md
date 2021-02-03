# lattice-connect
A small HTTP server + MQTT broker designed to communicate with [Lattice](https://gridplus.io/lattice) hardware wallets over the web.

## 📖 Background

The [Lattice](https://gridplus.io/lattice) is a next generation, always-online hardware wallet designed to sit behind a user's home WiFi network router. Since we cannot expect the average user to configure their home router, we expect default firewall settings that block incoming requests. For this reason, the Lattice is **not** designed to be contacted directly over HTTP. Instead, it uses a pub/sub model to subscribe to specific topics from an [MQTT](https://mqtt.org/) broker, which typically lives in the cloud. The Lattice connects to the MQTT broker and subscribes topics containing its own device ID. In order to reach Lattices, HTTP requests from third party applications must be transformed into MQTT messages and sent to the broker. The broker re-publishes the requests, which get picked up by the target Lattices (i.e. based on device ID) because those Lattices are subscribed to such messages from the broker.

By default, communication with all Lattices is routed through GridPlus' centralized cloud infrastructure. Although there is great care that goes into encrypting and securing these communication channels, we at GridPlus want your Lattice to be 100% yours, so we want to offer `lattice-connect` as an alternative to centralized message routing. This module exists to bridge connections between target Lattices and web applications (generally, but not limited to, applications that use the [`gridplus-sdk`](https://github.com/GridPlus/gridplus-sdk)). **If you are an advanced user, you can deploy this module yourself and change your Lattice's config to hook into your deployed instance.**

This module contains both HTTP server and MQTT broker, so it can be used as a singular communication endpoint.

## 🏃 Installation and Usage

You can run this `node.js` module in a variety of ways. First, clone this repo and run 

```
npm i && npm run build
```

You can now start the process with

```
npm start
```

This will create a [pm2](https://pm2.io/) process which will watch for crashes. See the [pm2 docs](https://pm2.io/docs/plus/overview/) for more info on pm2 itself.

**Stop the process:**

```
npm run stop
```

**Kill and remove the process from pm2:**

```
npm run rm
```

**Logging**

If you want to mointor crash reports (i.e. logs from `pm2`), you should run: 

```
npm run logs
```

Note that this will not be useful for debugging MQTT connections or other issues internal to the application itself. To do that, you should inspect the logs written to `LOG_DEST` (specified in `config.js`). You can also change `LOG_LEVEL` to a lower level for debugging (`trace` will produce the most logs). 

To watch logs in real time, start your pm2 process and run

```
tail -f <LOG_DEST>
```

### Running with Docker

You can also build and run this module locally with Docker:

```
npm run docker-build
npm run docker-run
```

### Deploying on AWS

The easiest way to deploy this module in the cloud is on AWS. Because it requires two ports to be open (one for HTTP, the other for MQTT), you cannot use Heroku, as their dynos only bind a single port and expose it as port 80.

You will need to do the following to prepare your AWS instance:

*  Make sure node.js and npm are installed (on ubuntu you can do this with `sudo apt-get update && sudo apt-get install node.js npm`)
* Update security group firewall settings. You can do this by going to the `Security` tab when you have your EC2 instance selected on the AWS console. Make sure the ports listed in `config.js` are open to `0.0.0.0/0` (by default, these are 3000 for the web server and 1883 for the MQTT broker). They are both `TCP` connections.

With these configurations in place, you can now clone this repo and run `npm i && npm run build && npm run start`. You can also run any of the (non-Docker) `npm` commands mentioned above.

## 🔌 Connecting your Lattice

If you want to point your Lattice to a deployed instance of this module, you will need to SSH into the device and change its configurations manually. To get SSH credentials, use your Lattice's UI to visit `Settings -> Advanced -> Device Info` and look for the `SSH Host` and `SSH Password` parameters. SSH in with the following pattern:

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
gridplus.remote_mqtt_address=rabbitmq.gridpl.us:8883
```

> NOTE: You may want to write down the original value of this so you can change it back if you want to go back to using GridPlus' default infrastructure.


You can now change this value with the following set of commands:

```
service gpd stop
service mosquitto stop
uci set gridplus.remote_mqtt_address=[host]:[BROKER_PORT]
uci commit
service mosquitto start
service gpd start
```

Where `host` is the location of your deployed instance of `lattice-connect` and `BROKER_PORT` refers to `MQTT.BROKER_PORT` in `config.js`, i.e. it is the *MQTT broker* port (1883 by default).

### Using an insecure connection (i.e. no SSL)

By default the Lattice is configured to make a secure mqtts (i.e. using SSL) connection to RabbitMQ. If you wish to use an insecure connection (i.e. use the default AWS instance host rather than your own domain), you will need to open mosquitto configuration (`/etc/mosquitto/mosquitto.conf`) and comment out the following line:

```
# bridge_capath /etc/ssl/certs/
```

> NOTE: Most messages to the Lattice are encrypted, but we still recommend using an SSL connection

You will also need to update `/etc/init.d/mosquitto`. This file contains the init script for starting the mosquitto process. You need to add a block comment around the `echo` command, which writes a new `mosquitto.conf` file every time the service restarts. Since you just edited your mosquitto conf file above, you need to make sure those changes don't get overwritten. Add `Block_comment` to `/etc/init.d/mosquitto` like this:

```
# change mosquitto configuration to enable mqtt over websockets
<<Block_comment
echo "# mqtt over websocket configuration
bind_address 0.0.0.0
port 1883
protocol mqtt
# log_type information
# log_dest syslog
# log_dest file /var/log/mosquitto/mosquitto.log
# log_type websockets
# websockets_log_level 0
listener 9001 0.0.0.0
protocol websockets

connection ${DEVICE_ID}
address ${REMOTE_MQTT_ADDRESS}
bridge_capath /etc/ssl/certs/
remote_username ${DEVICE_ID}
remote_password ${REMOTE_MQTT_PASSWORD}
remote_clientid ${DEVICE_ID}
try_private false
cleansession true
restart_timeout 2
topic from_agent/${DEVICE_ID}/# out 1
topic to_agent/${DEVICE_ID}/# in 1
topic lattice1/# in 1
" > /etc/mosquitto/mosquitto.conf
Block_comment
```

After making this change, you should restart the services:

```
service mosquitto restart
service gpd restart
```

Assuming your process is running in the cloud (or wherever you deployed it), your Lattice should establish a connection to the MQTT broker in a few seconds.

## 💻 Troubleshooting

If you are not getting messages from your external requester to your Lattice, something in the communication pathway is probably broken. Please read the above documentation to make sure you have done everything you need to for your situation. If you are sure you set your pathway up properly, there are a few ways to debug and troubleshoot what's going on.

### Make sure your Lattice is connected to the internet

The most generic troubleshooting you can do is unplug your Lattice and plug it back in. Wait a minute or two and make sure that the top right of your screen eventually shows only a single icon: the wifi icon. If it shows any other icons, you probably aren't connected to the internet. Update your wifi on your Lattice by going to `Settings -> Wifi`.

### Watch trace logs

If you want to get more information about what's going on with your app, update `config.js` to use `LOG_LEVEL: 'trace'` and run:

```
npm run stop && npm run start && tail -f <LOG_DEST>
```

(Where `LOG_DEST` is defined in `config.js`).

If you are trying to get a connection, you will see something like this after running `service mosquitto restart && service gpd restart`:

```
{"level":10,"time":1612201604724,"pid":45728,"hostname":"ip-172-31-26-163","msg":"BROKER: Client ([object Object]) published message: {\"retain\":true,\"qos\":1,\"topic\":\"$SYS/broker/connection/XXXXXX/state\",\"payload\":{\"type\":\"Buffer\",\"data\":[48]},\"brokerId\":\"20dc7c87-e5a1-4a33-a450-5c50dc5fb5ee\",\"clientId\":\"XXXXXX\"}"}
```

(Where I have replaced my device ID with `XXXXXX`.)

### When all else fails...

If you are in a bad state and can't get out, you can always go to your Lattice UI and navigate to `Settings -> Advanced -> Reeset Router`. This will restore factory settings for the Linux kernel you have been SSHing into. This reset will not delete your wallet, keys, or any secure data.

## 🧪 Testing

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

## ℹ️ Web API

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