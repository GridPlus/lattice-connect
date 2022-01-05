<img src="banner.png" />

# 👋 Introduction
By default, communication with a [Lattice<sup>1</sup>](https://gridplus.io/lattice) is routed through GridPlus' centralized cloud infrastructure. Although there is great care that goes into encrypting and securing these communication channels, we at [GridPlus](https://gridplus.io) want your Lattice<sup>1</sup> to be 100% yours, so we want to offer `lattice-connect` as an alternative to centralized message routing. 

**If you are an advanced user, you can deploy this module yourself and change your Lattice's config to hook into your own deployed instance.**

## 🔗 Related Links
 - [📢 Discord](https://twitter.com/gridplus)
 - [🐤 Twitter](https://discord.gg/Bt5fVDTJb9)
 - [📚 Knowledge Base](https://docs.gridplus.io)
&nbsp;

# ⌛️ Setup Guide

##### Estimated Time (TOTAL): 30–45 minutes

##### Overview of steps are:

1. ▶️ Installing & Running `lattice-connect`; and,
2. ☁️ _(OPTIONAL)_ Deploying to the Cloud; and,
3. 🔌 Configuring your Lattice<sup>1</sup> to connect; and,
4. 🥽 Testing the connection

## ▶️ Installing & Running

##### Estimated Time: 10 minutes

This section describes installing the `lattice-connector`, which is a small HTTP server + MQTT broker designed to communicate with Lattice<sup>1</sup> hardware wallets over the web.


It's possible to run the server:
  
 - as **a process directly** on a host system (using `node v12`); or,
 - through a **Docker** container.

<hr />

#### 🖥 Start the server with: NPM & PM2

You can start server with the following steps:

1. Clone the repo via `git clone`;
2. install dependencies via `npm ci`;
3. start the daemon with `npm run start`.

Starting the server creates a [pm2](https://pm2.io/) process which will watch for crashes. For more information on pm2, see the [pm2 docs](https://pm2.io/docs/plus/overview/).

##### Example:

```sh
# Clone the repo
$ git clone https://github.com/GridPlus/lattice-connect.git
$ cd lattice-connect

# Assumes 'node 12'
$ npm ci && npm run start

> lattice-connect@0.1.1 start
> npx pm2 start dist/index.js --name lattice-connect --watch

[PM2] Applying action restartProcessId on app [lattice-connect](ids: [ 0 ])
[PM2] [lattice-connect](0) ✓
[PM2] Process successfully started
⇆ PM2+ activated | Instance Name: laptop.local-5d42
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ lattice-connect    │ fork     │ 9    │ online    │ 0%       │ 17.7mb   │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

#### Stopping the server:
```sh
$ npm run stop
```

#### Killing the process and remove it from `pm2`:  
```sh
$ npm run rm
```

#### Logging and monitoring crash reports from `pm2`:
```sh
$ npm run logs
```

> _NOTE: this won't be useful when debugging MQTT connections or other issues internal to the application itself. For that, inspect the logs written to `LOG_DEST` (in `./config.js`). You may also change `LOG_LEVEL` to a lower level for debugging (`trace` will produce the most logs)._

To watch logs in real time, start your `pm2` process and run

```sh
tail -f <LOG_DEST>
```

#### 📦 Using Docker

1. Clone the repo via `git clone`;
2. build the container via `npm run docker-build`;
3. start the container with `npm run docker-run`.

##### Example:

```sh
# Clone the repo
$ git clone https://github.com/GridPlus/lattice-connect.git
$ cd lattice-connect

# Build the container and start it
$ npm run docker-build && npm run docker-run

> lattice-connect@0.1.1 docker-run
> docker run -d --name lattice-connect -p 3000:3000 -p 1883:1883 lattice-connect:1.0

94915b49dd5cd38242bc0cf8d086b2be4c772687bd707a9b331deca18112854f
```

#### Stopping the container:
```sh
$ docker stop lattice-connect
```

#### Rebuild source code changes:
```sh
$ docker stop lattice-connect && \
  docker rm lattice-connect && \
  npm run docker-build
```

#### Logging output from the container
```sh
$ docker logs -f lattice-container
```

#### 🔍 Configuration

The config parameters set in `config.js` are referenced when starting the application. These come with defaults and
also look at a local file `.config.json` (if it exists). This local `.config.json` is not tracked in git and it is
where you can define params that are inspected in `config.js`. Any param defined in both `config.js` and `.config.json` will be cast to the valuein `.config.json`.

##### Sample `.config.json`:

```
{
  "LOG_DEST": "./lattice.log",
  "MQTT_PASSWORD": "superdupersecretpassword"
}
```

## ☁️ Deploying to the Cloud

##### Estimated Time: varies

Either install method described in [Installing & Running](#%EF%B8%8F-installing--running) should work on most cloud hosting providers. **Important:** do be sure to check that your provider allows opening the following ports:  
  
- HTTP :80 (or, HTTPS :443);
- MQTT :1883 (or, MQTTS :8883).

##### Example: AWS EC2

On AWS, do the following to prepare your AWS instance:

* **install node.js and npm**: on Ubuntu, you can do this with `sudo apt-get update && sudo apt-get install node.js npm`;
* **update security group firewall settings**: Do this by going to the `Security` tab when you have your EC2 instance selected on the AWS console. Make sure the ports listed in `config.js` are open to `0.0.0.0/0` (by default, these are 3000 for the web server and 1883 for the MQTT broker). They are both `TCP` connections;
* **go to** the [Start the server with: NPM & PM2](#-start-the-server-with-npm--pm2).

## 🔌 Configuring your Lattice<sup>1</sup>

##### Estimated Time: 15 minutes

This section describes how to modify settings on your Lattice<sup>1</sup> so it's able to communicate with your `lattice-connect` deployed instance.

##### Overview of steps are:

1. SSH into your Lattice<sup>1</sup>; and,  
  a. stop `gpd` & `mosquitto` via `service <SERVICE> stop`; and,  
  b. review `gpd` settings via `uci show gridplus`; and,  
2. modify settings for the `gpd` & `mosquitto` services:  
  a. change the MQTT endpoint used in `gpd`; and,  
  b. _(OPTIONAL)_ disable SSL checks in `mosquitto` (MQTT); and. 
3. restart `gpd` and `mosquitto` services to apply changes.  

#### 1️⃣  SSH into your device

In order to point your Lattice<sup>1</sup> at your own deployed instance of this module, you'll need to SSH into the device and change its configurations manually. 

Your Lattice<sup>1</sup>'s UI displays the necessary `SSH Host` and `SSH Password` parameters. Navigate to them by tapping `Settings -> Advanced -> Device Info`.

From a remote terminal session, proceed by:

1. SSH'ing using `ssh root@<SSH Host>.local`;
2. entering the `SSH Password` displayed on the Lattice<sup>1</sup> when prompted. 

##### Example
```sh
# SSH command
$ root@<SSH Host>.local

# Input SSH password
root@<SSH Host>.local's password: 


BusyBox v1.28.3 () built-in shell (ash)

    __          __  __  _          ___
   / /   ____ _/ /_/ /_(_)_______ <  /
  / /   / __ `/ __/ __/ / ___/ _ \/ /
 / /___/ /_/ / /_/ /_/ / /__/  __/ /
/_____/\__,_/\__/\__/_/\___/\___/_/
-----------------------------------------------------
Ω-ware: 0.3.2 b228
Gridplus GCE Version: 0.48.12
-----------------------------------------------------
root@<SSH Host>:~#

```

##### 1️⃣🅰️ Stopping `gpd` & `mosquitto` services

Stop these two services in preparation to make your changes:

```bash
# Stop `gdp`
$ root@<SSH Host>: service gpd stop

# Stop `mosquitto`
$ root@<SSH Host>: service mostquitto stop
```


##### 1️⃣🅱️ Review `gpd` settings

The `gpd` stands for _GridPlus Daemon_ and it has several important functions, among them is connecting to the MQTT pub/sub.

To view the default settings, run `uci show gridplus`:

```bash
$ root@<SSH Host>: uci show gridplus
```

> _NOTE: Consider writing down the original values if you want to reset back to GridPlus' default infrastructure._

##### Example:

```bash
# Show default 'gpd' configuration
$ root@<SSH Host>: uci show gridplus

# List of settings
gridplus.env=production
gridplus.gpdLogFile=/gpd/gpd.log
gridplus.gceVersion=0.48.12
gridplus.remote_mqtt_address=rabbitmq.gridpl.us:8883
gridplus.releaseCatalogURL=https://release-catalog-api.gridpl.us/update
gridplus.releaseCatalogUser=lattice1
gridplus.releaseCatalogPass=<REDACTED>
gridplus.ftla=false
gridplus.personalizationEnabled=true
gridplus.gpdLogLevel=FATAL
gridplus.provisionLatticeAPIURL=https://provision-lattice-api.gridpl.us/provision
gridplus.personalized=true
gridplus.rootPass=<REDACTED>
gridplus.deviceID=<REDACTED>
gridplus.rabbitmq_password=<REDACTED>
```

#### 2️⃣  Modify Settings
You should see a line like the following:

```bash
gridplus.remote_mqtt_address=rabbitmq.gridpl.us:8883
```

##### 2️⃣🅰️ Changing `gpd` settings

To change this value, use:

 - `uci set gridplus.remote_mqtt_address=[host]:[BROKER_PORT]`
 - `uci commit`.

##### Example

```sh
# Stop 'gpd' & 'mosquitto'
$ root@<SSH Host>: service gpd stop
$ root@<SSH Host>: service mosquitto stop

# Point the MQTT connection to the relevant address ('1883' for non-SSL; see next section)
$ root@<SSH Host>: uci set gridplus.remote_mqtt_address=10.0.0.1:1883

# Apply the change
$ root@<SSH Host>: uci commit
```

##### 2️⃣🅱️ (OPTIONAL) Disable SSL checks in `mosquitto`

If you want to use an insecure connection (i.e. connect to a local IP address, or the default AWS instance host rather than your own secure domain), then:
  
  - connect to MQTT over port `1883`; and,
  - add `bridge_insecure` to the `/etc/init.d/mosquitto`; and,

See the `man` page for `mosquitto` to review [the full list of configuration options](https://mosquitto.org/man/mosquitto-conf-5.html).

<hr />

⚠️ **WARNING**: It's important to consider the risks that disabling SSL has, in that messages you send across the connection will no longer be encrypted. **Proceed cautiously**⚠️

<hr />

Open the configuration file using `vim`:

```sh
# Open file
$ root@<SSH Host>: vim /etc/init.d/mosquitto
```

Once in `vim`:
  
  - Navigate the cursor **LINE 31**;
  - enter `INSERT` mode by pressing the `i` key;
  - **insert** a `#` to comment out `bridge_capath /etc/ssl/certs`;
  - **insert** `bridge_insecure true` on the next line.

##### Example

```vim
// BEFORE
28 ...
29 connection ${DEVICE_ID}
30 address ${REMOTE_MQTT_ADDRESS}
31 bridge_capath /etc/ssl/certs/
32 remote_username ${DEVICE_ID}  
33 ...

// AFTER
28 ...
29 address ${REMOTE_MQTT_ADDRESS}
30 # bridge_capath /etc/ssl/certs/
31 bridge_insecure true
32 remote_username ${DEVICE_ID}  
33 ...

// Vim command to write file & quit:
// ESC + :x
```

##### 🔁 Restart services

After writing the file and closing `vim`:
 - restart service via `service mosquitto start`; and,
 - restart service via `service gpd start`.

##### Example:

```sh
# After quitting 'vim'
$ root@<SSH Host>: service mosquitto start
$ root@<SSH Host>: service gpd start
```

## 🥽 Testing the connection

##### Estimated Time: 5-15 minutes

This section descbribes how you can test the connection between your Lattice<sup>1</sup> and the `lattice-connect` module.

It's possible to test the connection in multiple ways:
  
 1. send a `POST` using `wget` from the Lattice<sup>1</sup> to the server; or,
 2. log into the cloud-hosted version of the [Lattice Manager](https://lattice.gridplus.io); or,
 3. connect (or re-connect) your Lattice<sup>1</sup> to MetaMask.

<hr />

#### 💻 Using `wget` from the Lattice<sup>1</sup> (and SSH)

While connected to a remote SSH terminal session:

1. get the `deviceID`; and,
2. use `wget` to send a HTTP `POST` request to the server; and,
3. if you had accounts connected to MetaMask, you may need to re-pair your device.

##### Example
```sh
# Read the 'deviceID';
# Your Lattice1 also displays 'Device ID' under 'Settings'
$ root@<SSH Host>: uci show gridplus.deviceID
gridplus.deviceID=abc123

# Send the HTTP 'POST' request
$ root@<SSH Host>: wget -O- --post-data='[1,2,3]' \
	--header='Content-Type:application/json' \
	'http://10.0.0.1:3000/abc123'

Connecting to 10.0.0.1:3000... connected.
HTTP request sent, awaiting response... 200 OK
Length: 151 [application/json]
Saving to: 'STDOUT'

...
2022-01-01 00:00:00 (1.96 MB/s) - written to stdout [151/151]
```

##### Testing using a fake `deviceID`

You can replace a known `deviceID` with a fake one and it will still work for testing purposes, so long as the requst hangs (i. e., you should not immediately get a `Connection refused` error). If  you do get `Connection refused` it means your process isn't running on the expected port.

#### 🌐 Log into the _Lattice Manager_

<hr />

⚠️ **WARNING**: If you're using an insecure connection (see [this earlier section](#2%EF%B8%8F⃣🅱%EF%B8%8F-optional-disable-ssl-checks-in-mosquitto)) you'll need to configure your browser to allow loading insecure content.

[This article](https://experienceleague.adobe.com/docs/target/using/experiences/vec/troubleshoot-composer/mixed-content.html?lang=en#task_5448763B8DC941FD80F84041AEF0A14D) can guide you through disabling insecure content checks on most browsers. **Proceed cautiously**⚠️

<hr />

From an Internet browser, navigate to the _Lattice Manager_:

 1. go to [https://lattice.gridplus.io](https://lattice.gridplus.io); and,
 2. at the bottom of the page, click _Settings_; and,
 3. in the section titled: _Connection Endpoint:_
    - for HTTPS; `https://[host | ip_address]:[HTTP_PORT]`; or,
    - for HTTP; `http://[host | ip_address]:[HTTP_PORT]`;
 4. click _Update and Reload_,

##### Example:
```sh
# Connection Endpoint:
http://10.0.0.1:3000
```

You are now ready to log in:

 1. enter your `deviceID`; and,
 2. enter your `password`.

You may be asked to pair (aka, give permssions) to your Lattice<sup>1</sup> before completing the login process.

##### Forcing your Lattice<sup>1</sup> to pair with the _Lattice Manager_

If your device was previously paired with the _Lattice Manager_, and you with to re-pair it, then unlock your Lattice<sup>1</sup> and tap `Permissions -> Lattice Manager -> Delete`.

Log out of the _Lattice Manager_ (if necessary), and then follow the steps above to log back in. You will be prompted to re-pair your device during the login process.

#### 🦊 MetaMask Pairing

Similarly to the _Lattice Manager_, you may be required to re-pair your device with _MetaMask_. Re-connecting your Lattice<sup>1</sup> using _"Connect Hardware Wallet"_ within _MetaMask_ should be your first step.

It may be that deleting _MetaMask_ from `Permissions` (on your device) is required. Fixing pairing issues is simple, and is how messages get routed from clients to devices. 

For the most comprehensive guide to connecting to the _MetaMask_ extension, review the [Knowledge Base](https://docs.gridplus.io/setup/metamask) article.
&nbsp;

# 🏛 Appendencies

1. Troubleshooting
2. Integration Tests
3. Web API
4. Background

## Appendix I: 🛠 Troubleshooting

Testing may reveal things simply aren't working; please re-read the above documentation be certain you've done everything as described for your situation.

If you're sure everything was setup properly, consider if:

 - the module's ports (see `config.js`) are set correctly wherever they are changed; or,
 - rebuilding the **Docker** container is needed to sync any source file changes; or,
 - your Lattice<sup>1</sup> is connected to the Internet, and update _WiFi_, if need be.

#### 🔍 Watching trace logs

If you want to get more information about what's going on with your app, update `config.js` to use `LOG_LEVEL: 'trace'` and run:

```
npm run stop && npm run start && tail -f <LOG_DEST>
```

(Where `LOG_DEST` is defined in `config.js`).

If you are trying to get a connection, you will see something like this after running `service mosquitto start && service gpd start`:

```
{"level":10,"time":1612201604724,"pid":45728,"hostname":"ip-172-31-26-163","msg":"BROKER: Client ([object Object]) published message: {\"retain\":true,\"qos\":1,\"topic\":\"$SYS/broker/connection/XXXXXX/state\",\"payload\":{\"type\":\"Buffer\",\"data\":[48]},\"brokerId\":\"20dc7c87-e5a1-4a33-a450-5c50dc5fb5ee\",\"clientId\":\"XXXXXX\"}"}
```

(Where I have replaced my device ID with `XXXXXX`.)

#### ☢️ When all else fails...

If you are in a bad state and can't get out, you can always go to your Lattice<sup>1</sup> UI and navigate to `Settings -> Advanced -> Reeset Router`. This will restore factory settings for the Linux kernel you have been SSH'ing into. This reset will not delete your wallet, keys, or any secure data.

## Appendix II: 🧪 Integration Tests

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

## Appendix III: ℹ️  Web API

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

## Appendix IV: 📖 Background

The [Lattice<sup>1</sup>](https://gridplus.io/lattice) is a next generation, always-online hardware wallet designed to sit behind a user's home WiFi network router. Because we aren't expecting most users to reconfigure their home router   in the event a default firewall might block incoming requests, the Lattice<sup>1</sup> is **not** designed to communicate over HTTP. 

The implemented pub/sub model subscribes to specific topics available on a cloud-hosted [MQTT](https://mqtt.org/) broker GridPlus provides by default. Requests from third-party applications are transformed into MQTT messages and sent to this broker, and are then forwarded to a Lattice<sup>1</sup> with a matching device ID.

As previously mentioned, having the choice to deploy the `lattice-connect` server on infrastructure our customers directly control is a priority for us, and a decision GridPlus supports.

