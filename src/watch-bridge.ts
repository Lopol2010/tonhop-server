import { Abi, BlockNumber, BlockTag, ContractEventName, GetContractEventsReturnType, Log, createPublicClient, http, parseUnits } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
// import env from './utils/env';
import { bridgeAbi, bridgeAddress } from './generated';
import { TransferDetailsArray, } from './HighloadWalletV3/HighloadWalletV3Wrapper';
import { isValidTonAddress, isTestnetAddress, convertDecimals } from './utils/utils';
import { networkConfig } from './networkConfig';
import { getTransaction, getTransactionReceipt } from 'viem/actions';
const PQueue = require('p-queue').default;

const client = createPublicClient({
    chain: networkConfig.bsc.chain,
    transport: http(networkConfig.bsc.rpcUrl),
});

const queue = new PQueue({concurrency: 1});

export function watchBridgeForEventLogs(onLogsCallback: (_: TransferDetailsArray) => void, pollingInterval: number = 4_000) {

    console.log("[Listener] listening at:", bridgeAddress);
    

    let unwatch = client.watchContractEvent({
        abi: bridgeAbi,
        address: bridgeAddress,
        pollingInterval: pollingInterval,
        eventName: "Bridged",
        onError: err => { console.log(err); },
        onLogs: logs => {
            let transferDetailsArray = filterLogs(logs);
            transferDetailsArray.forEach(({sourceLog: log})=> console.log(`[Listener] new log: ${log.blockNumber} ${log.transactionHash} ${log.logIndex}`));
            
            if (transferDetailsArray.length > 0) {
                // TODO: handle rejection
                queue.add(() => onLogsCallback(transferDetailsArray));
            }
        }
    })
    return unwatch;
}

export async function retrieveMissedLogs(
    startFromLog: {
        blockNumber: bigint,
        blockHash: string,
        transactionHash: string,
        logIndex: number
    }, 
    onLogsCallback: (_: TransferDetailsArray) => Promise<void>
) {

    /*
        TODO: verify assumption that returned logs are ordered from oldest to newest, e.g. [log1, log2, log3]

        implementation is super optimistic:
        1. get ALL logs starting from the one saved in our DB and to latest mined block
        2. iterate logs, remove 0 or more utnil found log that is last saved in our DB, remove it too
        3. send result array for processing
    */

    console.log(`[Backtrack] start at: ${startFromLog.blockNumber} ${startFromLog.transactionHash} ${startFromLog.logIndex}`);

    // TODO: handle rejection
    let logs = await client.getContractEvents({
        abi: bridgeAbi,
        address: bridgeAddress,
        eventName: "Bridged",
        // TODO: careful with this, archival node might be needed, RPC nodes will limit max range between blocks
        fromBlock: startFromLog.blockNumber,
        toBlock: "latest", 
    });

    // logs.forEach(log => console.log(`[Backtrack] fetched log: ${log.blockNumber} ${log.transactionHash} ${log.logIndex}`));
    let transferDetailsArray = filterLogs(logs);
    transferDetailsArray.forEach(({sourceLog: log})=> console.log(`[Backtrack] fetched log: ${log.blockNumber} ${log.transactionHash} ${log.logIndex}`));

    if (transferDetailsArray.length > 0) {
        let splitAt = transferDetailsArray.findIndex((transferDetails) => {
            return transferDetails.sourceLog.blockNumber == startFromLog.blockNumber
                && transferDetails.sourceLog.transactionHash == startFromLog.transactionHash
                && transferDetails.sourceLog.logIndex == startFromLog.logIndex
        });

        if(splitAt !== -1) {
            // remove elements [0..splitAt]
            transferDetailsArray = transferDetailsArray.slice(splitAt + 1);
            if(transferDetailsArray.length > 0) {
                // TODO: handle rejection
                await onLogsCallback(transferDetailsArray);
                return;
            }
        }
    }
    console.log("[Backtrack] missed logs not found.")
};

type BridgedEventLogType = Log<bigint, number, boolean, undefined, boolean, typeof bridgeAbi, 'Bridged'>;
function filterLogs(logs: BridgedEventLogType[]) {
    let transferDetailsArray: TransferDetailsArray = [];
    logs.forEach(log => {
        if (log.removed) {
            console.warn("Skipping removed log: ", log);
            return;
        }

        if (log.blockHash == null || log.transactionHash == null || log.logIndex == null || log.blockNumber == null) {
            console.warn("Skipping log from pending tx: ", log);
            return;
        }

        let { args: { user, amount, destination } } = log;

        if (!user || !amount || !destination) {
            console.warn("Skipping log with missing args: ", log);
            return;
        }

        if (!isValidTonAddress(destination)) {
            console.warn("Skipping invalid TON address: ", destination);
            return;
        }

        if (networkConfig.ton.network === "mainnet" && isTestnetAddress(destination)) {
            console.warn("Skipping transfer to address with test flag while bridge wallet is on mainnet: ", destination);
            return;
        }

        let tonAmount = convertDecimals(amount, networkConfig.bsc.wtonDecimals, networkConfig.ton.tonDecimals);
        let minTonAmount = parseUnits(networkConfig.bsc.minAmount, networkConfig.ton.tonDecimals);
        if (tonAmount < minTonAmount) {
            console.warn("Skipping log with too small amount: ", log);
            return;
        }

        transferDetailsArray.push({
            to: destination,
            value: tonAmount,
            sourceLog: {
                blockNumber: log.blockNumber,
                blockHash: log.blockHash,
                transactionHash: log.transactionHash,
                logIndex: log.logIndex
            }
        })
    });
    return transferDetailsArray;
}