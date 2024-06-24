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
        // url: "https://bsc-mainnet.nodereal.io/v1/a97ef8ecb0714e9da7f9717d3e7192be"
        
        
        url: "https://site1.moralis-nodes.com/bsc/61e642a121de41cd8e769e3832c33a69",
        // url: "https://go.getblock.io/f0c77ff583ab4199a00380632a01eb7c",
        // blockNumber: 39329000
        
        
      }
    }
  },
  abiExporter: {
    runOnCompile: true 
  }
};

export default config;
