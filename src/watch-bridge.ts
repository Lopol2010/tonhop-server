import { createPublicClient, http } from 'viem';
import { hardhat, mainnet } from 'viem/chains';
import env from './env';
import { bridgeAbi, bridgeAddress } from './generated';
import { TransferDetailsArray, } from './send-ton';
import { parseWTON, validateTonAddress } from './utils';

const client = createPublicClient({
    chain: env.PRODUCTION ? mainnet : hardhat,
    transport: http(),
});

export function watchBridge(sendMultipleTransfers: (_: TransferDetailsArray) => void, pollingInterval: number = 4_000) {

    let unwatch = client.watchContractEvent({
        abi: bridgeAbi,
        address: bridgeAddress,
        pollingInterval: pollingInterval,
        eventName: "Bridged",
        // TODO: maybe handle 'onError: ...', depends on what errors could be there?
        onLogs: logs => {
            // @ts-ignore
            let transferDetailsArray = [];
            logs.forEach(log => {
                if (log.removed) {
                    console.warn("Ignoring log due to invalid filter: ", log);
                    return;
                }

                // TODO: verify that transaction was succesfull, this is relevant (maybe, not sure) if contract emits event before revertable code
                // TODO: add basic replay protection, not sure if it's really needed. just cache logId and clear that cache after some limit reached to save memory

                if(log.blockHash == null || log.transactionHash == null || log.logIndex == null) {
                    console.warn("Ignoring log from pending tx: ", log);
                    return;
                }

                // WTON in BNB chain has the same decimal places as TONCOIN in TON.
                let { args: { user, amount, destination } } = log;

                if(!user || !amount || !destination) {
                    console.warn("Ignoring log with missing args: ", log);
                    return;
                }

                if(!validateTonAddress(destination)) {
                    console.warn("Ignoring log invalid TON network address: ", log);
                    return;
                }

                if(amount < parseWTON("0.1")) {
                    console.warn("Ignoring log with too small amount: ", log);
                    return;
                }
                
                // TODO: should see how much gas this long ID would spend when attached to TONCOIN transfer
                let logIdentifier = log.blockHash + log.transactionHash + log.logIndex;
                transferDetailsArray.push({
                    to: destination,
                    value: amount,
                    logId: logIdentifier
                })
            });

            if(transferDetailsArray.length > 0) {
                //@ts-ignore
                sendMultipleTransfers(transferDetailsArray);
            }

        }
    })
    return unwatch;
}