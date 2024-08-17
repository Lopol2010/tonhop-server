import { Address, TonClient, Transaction } from '@ton/ton';
import { wait } from '../utils/utils';
import axios from 'axios';
import { getHttpEndpoint } from '@orbs-network/ton-access';

interface TONWatcherOptions {
    client: TonClient;
    accountAddress: Address;
    startTransactionLT: string | undefined
    startTransactionHash: string | undefined;
    pollInterval?: number;
    onNewStartTransaction: (lt: string, hash: string) => Promise<void>;
}

export class TONWatcher {

    client: TonClient;
    accountAddress: Address;
    startTransactionLT: string | undefined
    startTransactionHash: string | undefined;
    pollInterval: number;
    onNewStartTransaction: (lt: string, hash: string) => Promise<void>;

    private constructor(private options: TONWatcherOptions) {
        this.client = options.client;
        this.accountAddress = options.accountAddress;
        this.startTransactionLT = options.startTransactionLT;
        this.startTransactionHash = options.startTransactionHash;
        this.pollInterval = options.pollInterval ?? 5 * 1000;
        this.onNewStartTransaction = options.onNewStartTransaction;
    }

    public static async create(options: TONWatcherOptions) {
        let instance = new TONWatcher(options);
        return instance;
    }


    async start(onTransaction: (tx: Transaction) => Promise<void>) {
        console.log(`[TONWatcher] Watching for new transactions at: ${this.accountAddress}`);

        const getTransactions = async (
            retryCount: number = 0,
            newStartTransaction: {
                lt: string,
                hash: string,
            } | null = null,
            offsetTransactionLT?: string,
            offsetTransactionHash?: string,
        ): Promise<{ lt: string, hash: string } | null> => {
            const COUNT = 10;


            if (offsetTransactionLT) {
                // console.log(`[TONWatcher] Get ${COUNT} transactions before transaction ${offsetTransactionLT}:${offsetTransactionHash}`);
            } else {
                // console.log(`[TONWatcher] Get last ${COUNT} transactions`);
            }

            if (this.startTransactionLT) {
                // console.log(`[TONWatcher] But newer than transaction ${this.startTransactionLT}:${this.startTransactionHash}`);
            }

            let transactions;

            try {
                transactions = await this.client.getTransactions(this.accountAddress, {
                    limit: COUNT,
                    ...(offsetTransactionLT != undefined && { lt: offsetTransactionLT }),
                    ...(offsetTransactionHash != undefined && { hash: offsetTransactionHash }),
                    ...(this.startTransactionLT != undefined && { to_lt: this.startTransactionLT.toString() }),
                    archival: true
                });
            } catch (error) {
                let newError = error;
                if (error instanceof axios.AxiosError && error.response) {
                    newError = {
                        status: error.response.status,
                        statusText: error.response.statusText,
                        data: error.response.data
                    };
                }
                console.log("[TONWatcher] error:", newError);

                // if an API error occurs, try again
                retryCount++;
                if (retryCount < 10) {
                    await wait(retryCount * 1000);
                    return getTransactions(retryCount, newStartTransaction, offsetTransactionLT, offsetTransactionHash);
                } else {
                    return null;
                }
            }

            // console.log(`[TONWatcher] Got ${transactions.length} transactions`);

            if (!transactions.length) {
                return newStartTransaction;
            }

            if (newStartTransaction == null) {
                newStartTransaction = {
                    lt: transactions[0].lt.toString(),
                    hash: transactions[0].hash().toString("base64")
                }
            }

            for (const tx of transactions) {
                console.log(`[TONWatcher] Got new transaction ${tx.lt} : ${tx.hash().toString("base64")}`);
                await onTransaction(tx);
            }

            if (transactions.length === 1) {
                return newStartTransaction;
            }

            const lastTx = transactions[transactions.length - 1];
            return await getTransactions(0, newStartTransaction, lastTx.lt.toString(), lastTx.hash().toString('base64'));
        }


        let isProcessing = false;

        const tick = async () => {
            if (isProcessing) return;
            isProcessing = true;

            try {
                const result = await getTransactions(0, null, undefined, undefined);
                if (result != null) {
                    this.startTransactionLT = result.lt;
                    this.startTransactionHash = result.hash;
                    await this.onNewStartTransaction(result.lt, result.hash)
                }

            } catch (e) {
                console.error("[TONWatcher] error:", e);
            }

            isProcessing = false;
        }

        setInterval(tick, this.pollInterval);
        tick();
    }

}
