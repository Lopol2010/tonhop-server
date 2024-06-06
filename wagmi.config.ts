import { defineConfig } from '@wagmi/cli'
import { Abi, erc20Abi } from 'viem'
import bridgeAbi from './abi/BridgeContract.json'

export default defineConfig({
  out: 'src/generated.ts',
  contracts: [{
    name: "erc20",
    abi: erc20Abi,
  },{
    name: "bridge",
    abi: bridgeAbi as Abi,
    address: "0xD50346F70F16B3a9Bd2770731Fc25A0a2230d594"
  },{
    name: "wton",
    abi: erc20Abi,
    address: "0x76A797A59Ba2C17726896976B7B3747BfD1d220f"
  }],
  plugins: [],
})
