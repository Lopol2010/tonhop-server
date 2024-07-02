import { defineConfig } from '@wagmi/cli'
import { Abi, erc20Abi } from 'viem'
import { networkConfig } from './src/networkConfig'
import bridgeAbi from './local-blockchain/artifacts/contracts/BridgeContract.sol/BridgeContract.json'

export default defineConfig(() => {
  if (process.env.NODE_ENV === "production" || process.env.MODE === "hardhat") {
    return {
      out: 'src/generated.ts',
      contracts: [{
        name: "bridge",
        abi: bridgeAbi.abi as Abi,
        address: "0xCE3878b823c3207AE698C5D7eC45DA162727022F"
      }, {
        name: "wton",
        abi: erc20Abi,
        address: "0x76A797A59Ba2C17726896976B7B3747BfD1d220f",
      }],
      plugins: [],
    }
  } else {
    return {
      out: 'src/generated.ts',
      contracts: [{
        name: "bridge",
        abi: bridgeAbi.abi as Abi,
        address: "0xa9C1C70692E530AfbB2A09Dac3741D6449f16D2c",
      }, {
        name: "wton",
        abi: erc20Abi,
        address: "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee",
      }],
      plugins: [],
    }
  }
})
