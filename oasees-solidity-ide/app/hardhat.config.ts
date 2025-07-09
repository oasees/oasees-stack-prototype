
import { HardhatUserConfig } from "hardhat/config";
import '@nomicfoundation/hardhat-verify';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import { HardhatNetworkAccountUserConfig } from "hardhat/types";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: { optimizer: {enabled: true, runs:100}}
   },
  networks: {
    'oasees-blockchain': {
      url: 'http://10.160.3.172:8545/',
    },
  },
  etherscan: {
    apiKey: {
      'oasees-blockchain': 'empty'
    },
    customChains: [
      {
        network: "oasees-blockchain",
        chainId: 31337,
        urls: {
          apiURL: "http://10.160.3.172:8082/api",
          browserURL: "http://10.160.3.172:8082"
        }
      }
    ]
  }
};

export default config;