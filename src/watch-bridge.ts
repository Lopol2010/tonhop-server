import { createPublicClient, http, parseUnits } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import env from './env';
import { bridgeAbi, bridgeAddress } from './generated';
import { TransferDetailsArray, } from './send-ton';
import { isValidTonAddress, isTestnetAddress, convertDecimals } from './utils';
import { config } from './config';
import { getTransaction, getTransactionReceipt } from 'viem/actions';

const client = createPublicClient({
    chain: config.bsc.chain,
    transport: http(),
});

// TODO: on start should gather missed txs? but kind of database needed for this 
export function watchBridge(sendTonBatch: (_: TransferDetailsArray) => void, pollingInterval: number = 4_000) {

    console.log("watching Bridge:", bridgeAddress);
  
    let unwatch = client.watchContractEvent({
        abi: bridgeAbi,
        address: bridgeAddress,
        pollingInterval: pollingInterval,
        eventName: "Bridged",
        onLogs: logs => {
            // @ts-ignore
            let transferDetailsArray = [];
            logs.forEach(log => {
                if (log.removed) {
                    console.warn("Ignoring removed log: ", log);
                    return;
                }

                // TODO: add basic replay protection, not sure if it's necessary. 
                // just cache logId and clear that cache after some limit reached to save memory

                if (log.blockHash == null || log.transactionHash == null || log.logIndex == null) {
                    console.warn("Ignoring log from pending tx: ", log);
                    return;
                }

                let { args: { user, amount, destination } } = log;

                if (!user || !amount || !destination) {
                    console.warn("Ignoring log with missing args: ", log);
                    return;
                }

                if (!isValidTonAddress(destination)) {
                    console.warn("Ignoring invalid TON address: ", destination);
                    return;
                }

                if (config.ton.network === "mainnet" && isTestnetAddress(destination)) {
                    console.warn("Ignoring attempt to transfer to testnet address while bridge wallet is on mainnet: ", destination);
                    return;
                }

                let tonAmount = convertDecimals(amount, config.bsc.wtonDecimals, config.ton.tonDecimals);
                let minTonAmount = parseUnits(config.bsc.minAmount, config.ton.tonDecimals);
                if (tonAmount < minTonAmount) {
                    console.warn("Ignoring log with too small amount: ", log);
                    return;
                }

                let logIdentifier = log.blockHash + log.transactionHash + log.logIndex;
                transferDetailsArray.push({
                    to: destination,
                    value: tonAmount,
                    logId: logIdentifier
                })
            });

            if (transferDetailsArray.length > 0) {
                //@ts-ignore
                sendTonBatch(transferDetailsArray);
            }

        }
    })
    return unwatch;
}