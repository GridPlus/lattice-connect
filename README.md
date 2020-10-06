# lattice-connector-endpoint
A small HTTP server + MQTT broker designed to bridge the web with Lattices in the field.

## Background

The [Lattice](https://gridplus.io/lattice) is a next generation, always-online hardware wallet designed to sit behind a consumer's home wifi network. Since we cannot expect the average user to configure their home router, the Lattice is **not** designed to be contacted directly over HTTP. This module exists to bridge connections between target Lattices and external applications that use the [`gridplus-sdk`](https://github.com/GridPlus/gridplus-sdk).

## Lattice Communication Pathway

The pathway to communicate with a Lattice involves the following:

1. The Lattice itself must first subscribe to topic `to_agent/<deviceID>/request/<requestID>` on a known MQTT broker &dagger;. The topic must contain the Lattice's unique `deviceID` in order to be discoverable by the target Lattice.
2. An external web application wishes to communicate with a known Lattice using its device ID. This application makes a request to the `lattice-connector-endpoint`'s REST HTTP server using the POST route in `src/app.js`.
3. The HTTP server takes the message payload and uses a local MQTT client (connected to the same MQTT broker) to publish the payload using the above topic (`to_agent/<deviceID>/request/<requestID>`) to which the target Lattice is subscribed. Because both MQTT clients (Lattice and `lattice-connector-endpoint`) are connected to the same MQTT broker, the message will make it to the target Lattice.
4. After publishing the previous message, the HTTP server tells its local MQTT client to subscribe to a matching "response topic": `from_agent/<deviceID>/response/<requestID>`. The HTTP server stands up a 60 second timeout after which it unsubscribes from the topic. If a response comes through before the timeout expires, it unsubscribes and returns the response payload as an HTTP response to the original web requester (i.e. as part of the original web request).

> &dagger; *NOTE: V1 Lattices point to a hardcoded GridPlus cloud broker, but future versions will allow users to stand up their own connecting endpoint (i.e. this repo) to create a custom MQTT broker. We may also make the device ID itself be configurable*

### Example Communication Pathway

The prototypical example would be a DeFi app that uses Metamask. In this case Metamask would use the [`eth-lattice-keyring`](https://github.com/GridPlus/eth-lattice-keyring) to send requests to the Lattice via the `gridplus-sdk`.

The pathway would look like this:

> DeFi web app -> Metamask -> `eth-lattice-keyring` -> `gridplus-sdk` -> `lattice-connector-endpoint` -> target Lattice

## Installation

> TODO

## Dockerizing

> TODO
