// Test using this service and the gridplus-sdk to connect to a target Lattice device.
// The Lattice must be configured to point to this host. The easiest way to do so is to run this on a machine
// that shares a LAN with the Lattice device. On the Lattice GCE, you can update your `gridplus.remote_mqtt_address`
// to point to the `en0` address of this machine (`ifconfig en0`).
//
// To change your config on your Lattice (must be a dev lattice), SSH into your GCE and run:
// service gpd stop && service mosquitto stop
// uci set gridplus.remote_mqtt_address=<en0>:<MQTT.BROKER_PORT>
// uci commit
// service mosquitto start && service gpd start
const crypto = require('crypto')
const expect = require('chai').expect
const ps = require('child_process')
const SDK = require('gridplus-sdk').Client;
const question = require('readline-sync').question
const config = require('../config.js');
// Hardcoded key to use with the SDK so that we only have to pair with the Lattice once.
const TEST_KEY = Buffer.from('93b9cacfa4e417bf8513ad8dbbb0bb35d48c4c154959663a9f25cf6508e85f90', 'hex');
// Global service process
let servicePs = null;
// Global SDK client
let sdkClient = null;

describe('\x1b[44mIntegration test with gridplus-sdk\x1b[0m', () => {
  before(() => {
    setupTest()
  })

  it('Should connect to a Lattice', async () => {
    const id = question('Please enter the ID of your Lattice: ')
    let err = await Promisify(sdkClient, 'connect', id, false)
    expect(err).to.equal(null, `Failed to find Lattice: ${err.toString()}`)
    // If we are not paired, we need to do that now
    if (sdkClient.hasActiveWallet() === false) {
      const secret = question('Please enter the pairing secret: ');
      err = await Promisify(sdkClient, 'pair', secret, false)
      expect(err).to.equal(null, `Failed to pair: ${err.toString()}`)
    }
  })

  it('Should get an Ethereum address from the Lattice', async () => {
    const opts = { 
        currency: 'ETH', 
        startPath: [0x8000002c, 0x8000003c, 0x80000000, 0, 0], // m/44'/60'/0'/0/0
        n: 1
      }
    const err = await Promisify(sdkClient, 'getAddresses', opts)
    expect(err).to.equal(null, `Failed to fetch ETH address: ${err.toString()}`)
  })

  it('Should kill service and exit', () => {
    kill()
    expect(true).to.equal(true)
  })
})

async function Promisify(c, f, opts, _reject=true) {
  return new Promise((resolve, reject) => {
    if (_reject) {
      c[f](opts, (err, res) => {
        if (err) return reject(err)
        else     return resolve(res)
      })
    } else {
      c[f](opts, (err) => resolve(err))
    }
  })
}

function setupTest() {
  // Build the source files
  prettyPrint('Building module...', 'yellow')
  try {
    ps.execSync('npm run build')
  } catch (err) {
    prettyPrint(`Failed to build module:  ${err.toString()}`, 'red', console.error)
    process.exit()
  }
  // Create the process
  prettyPrint('Spawning service...', 'yellow')
  spawnService();
  // Initialize the SDK
  try {
    sdkClient = new SDK({ 
      baseUrl: `http://localhost:${config.APP_PORT}`,
      crypto,
      name: 'lattice-connector-test',
      privKey: TEST_KEY,
    })
  } catch (err) {
    prettyPrint(`Failed to create SDK client: ${err.toString()}`, 'red', console.error)
    kill()
  }
  prettyPrint('Finished setting up.\n', 'green')
}

function spawnService() {
  servicePs = ps.spawn('node', [`${__dirname}/../dist/index.js`])
  servicePs.on('error', (err) => {
    prettyPrint(`Spawned process encountered error: ${err}`, 'red', console.error)
    kill()
  })
}

function kill() {
  try {
    servicePs.kill('SIGINT')
  } catch (err) {
    prettyPrint(`Failed to kill service: ${err.toString()}`, 'red', console.error)
  }
}

function prettyPrint(text, color=null, f=console.log) {
  let prefix = '';
  switch (color) {
    case 'green':
      prefix = '\x1b[32m'
      break
    case 'red':
      prefix = '\x1b[31m'
      break
    case 'yellow':
      prefix = '\x1b[33m'
      break
  }
  const term = '\x1b[0m'
  f(prefix + text + term)
}



