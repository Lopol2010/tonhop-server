import { createPublicClient, http } from 'viem'
import { hardhat, mainnet } from 'viem/chains'
import env from './env'
 
const client = createPublicClient({ 
  chain: env.PRODUCTION ? mainnet : hardhat, 
  transport: http(), 
});

export default async function () {
    const blockNumber = await client.getBlockNumber();
    console.log(blockNumber)
}