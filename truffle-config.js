const path = require("path");
const fs = require('fs');
const mnemonic = fs.readFileSync('.secret').toString().trim();
const HDWalletProvider = require('@truffle/hdwallet-provider');



module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      network_id: "*" // Match any network id
    },
    // ropsten: {
    //   provider: () => new HDWalletProvider(mnemonic, 'https://ropsten.infura.io/v3/ba374d41ee3f4c65ab05c31c4dd452f6'),
    //   network_id: 3, // Ropsten's id
    //   gas: 5500000, // Ropsten has a lower block limit than mainnet
    //   confirmations: 2, // # of confs to wait between deployments. (default: 0)
    //   timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
    //   skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    // }
    rinkeby: {
      provider: function() {
       return new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/v3/9bc8bc35cc5242cc8b90ad51fc11f8d0");
      },
      network_id: 4,
      gas: 4500000,
      gasPrice: 10000000000,
      from: '0x5EfB4d91D601C69CF6Ac203A049D85FbafC2e3dd'
     },
    },
    compilers: {
      solc: {
        version: "^0.8.4",
      },
    }
};
