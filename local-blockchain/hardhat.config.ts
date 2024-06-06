import "@nomicfoundation/hardhat-toolbox-viem";
import 'hardhat-abi-exporter';
import type { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      gas: "auto",
      forking: {
        // url: "https://bsc-rpc.publicnode.com",
        url: "https://site1.moralis-nodes.com/bsc/61e642a121de41cd8e769e3832c33a69",
        // blockNumber: 39329000
        
        
      }
    }
  },
  abiExporter: {
    runOnCompile: true 
  }
};

export default config;
