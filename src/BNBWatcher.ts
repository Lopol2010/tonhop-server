import { Block, HttpTransport, ParseAccount, PublicClient, createPublicClient, http } from 'viem';
// import env from './utils/env';
import { networkConfig, NetworkConfigInterface } from './networkConfig';
import { Chain, TransferRequestFromEVMModel } from './models/TransferRequest';
import { BridgedLog } from './LogValidation';


export class BNBWatcher {

    private client: PublicClient<HttpTransport, typeof networkConfig.bsc.chain, undefined, undefined>;

    constructor() {
        this.client = createPublicClient({
            chain: networkConfig.bsc.chain,
            transport: http(networkConfig.bsc.rpcUrl),
        });
    }

    public startWatching(onLogsCallback: (logs: BridgedLog[]) => void, pollingInterval: number = 4_000) {

        console.log("[BNBWatcher] listening at:", networkConfig.bsc.bridgeAddress);

        let unwatch = this.client.watchContractEvent({

            abi: networkConfig.bsc.bridgeAbi,
            address: networkConfig.bsc.bridgeAddress,
            pollingInterval: pollingInterval,
            eventName: "Bridged",
            onError: err => { console.log("[Listener] Error:", err); },
            onLogs: logs => {
                onLogsCallback(logs);
            }
        })
        return unwatch;
    }

    public async retrieveMissedLogs(
        onLogsCallback: (_: BridgedLog[]) => Promise<void>
    ) {

        const lastTransfer = await TransferRequestFromEVMModel.findLast(Chain.BNB);

        if (!lastTransfer) {
            console.log("[Backtrack] Last processed transfer is not found, backtracking is aborted")
            return;
        }


        console.log(`[Backtrack] start at: ${lastTransfer.blockHash} ${lastTransfer.transactionHash} ${lastTransfer.logIndex}`);

        let fromBlock = await this.client.getBlock({
            blockHash: lastTransfer.blockHash,
            includeTransactions: false
        }).then((block) => block.number);

        if (!fromBlock) {
            console.log(`[Backtrack] Aborted, block number is null`);
            return;
        }

        /*
            1. get ALL logs starting at block stored in DB and to the latest block
            2. remove logs until log last saved in DB, remove it too
            3. pass result array into callback
        */
        let logs: BridgedLog[] = [];

        try {
            logs = await this.client.getContractEvents({
                abi: networkConfig.bsc.bridgeAbi,
                address: networkConfig.bsc.bridgeAddress,
                eventName: "Bridged",
                // TODO: do fetching with pagination 
                fromBlock: fromBlock,
                toBlock: "latest",
            });
        } catch (error) {
            console.log("[Backtrack] Aborted due to error: ", error);
            return;
        }

        if (logs.length == 0) {
            console.log("[Backtrack] Nothing found.")
            return;
        }

        logs.forEach((log) => console.log(`[Backtrack] Fetched log: ${log} ${log.blockHash} ${log.transactionHash} ${log.logIndex}`));

        let splitIndex = logs.findIndex((log) => {
            return log.blockHash == lastTransfer.blockHash
                && log.transactionHash == lastTransfer.transactionHash
                && log.logIndex == lastTransfer.logIndex
        });

        if (splitIndex !== -1) {
            // remove elements from 0 to splitIndex
            logs = logs.slice(splitIndex + 1);
            if (logs.length > 0) {
                await onLogsCallback(logs);
                return;
            }
        }
    };
}