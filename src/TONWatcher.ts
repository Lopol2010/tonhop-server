import { Block, HttpTransport, ParseAccount, PublicClient, createPublicClient, http } from 'viem';
// import env from './utils/env';
import { networkConfig, NetworkConfigInterface } from './networkConfig';
import { CrosschainTransfer, CrosschainTransferModel, TransferOriginBNB } from './models/CrosschainTransfer';
import { BridgedLog } from './LogValidation';
import { Address, TonClient } from '@ton/ton';
import { wait } from './utils/utils';

export class TONWatcher {

    private client: TonClient;
    private accountAddress: Address;
    private startTime: number;
    private onTransaction: any;

    constructor(client: TonClient, accountAddress: string | Address, startTime: number, onTransaction: (tx: any) => void) {
        this.client = client;
        this.accountAddress = typeof accountAddress === 'string' ? Address.parse(accountAddress) : accountAddress;
        this.startTime = startTime; // start unixtime (stored in your database), transactions made earlier will be discarded.
        this.onTransaction = onTransaction;
    }

    async start() {
        const getTransactions = async (time: number, offsetTransactionLT?: string, offsetTransactionHash?: string, retryCount: number = 0): Promise<number> => {
            const COUNT = 10;

            if (offsetTransactionLT) {
                console.log(`Get ${COUNT} transactions before transaction ${offsetTransactionLT}:${offsetTransactionHash}`);
            } else {
                console.log(`Get last ${COUNT} transactions`);
            }

            // TON transaction has composite ID: account address (on which the transaction took place) + transaction LT (logical time) + transaction hash.
            // So TxID = address+LT+hash, these three parameters uniquely identify the transaction.
            // In our case, we are monitoring one wallet and the address is `accountAddress`.

            let transactions;

            try {
                transactions = await this.client.getTransactions(this.accountAddress, {
                    limit: COUNT, 
                    ...(offsetTransactionLT && { lt: offsetTransactionLT }), 
                    ...(offsetTransactionHash && { hash: offsetTransactionHash }) 
                });
            } catch (e) {
                console.error(e);
                // if an API error occurs, try again
                retryCount++;
                if (retryCount < 10) {
                    await wait(retryCount * 1000);
                    return getTransactions(time, offsetTransactionLT, offsetTransactionHash, retryCount);
                } else {
                    return 0;
                }
            }

            console.log(`Got ${transactions.length} transactions`);

            if (!transactions.length) {
                // If you use your own API instance make sure the code contains this fix https://github.com/toncenter/ton-http-api/commit/a40a31c62388f122b7b7f3da7c5a6f706f3d2405
                // If you use public toncenter.com then everything is OK.
                return time;
            }

            if (!time) time = transactions[0].now;

            for (const tx of transactions) {

                if (tx.now < this.startTime) {
                    return time;
                }

                await this.onTransaction(tx);
            }

            if (transactions.length === 1) {
                return time;
            }

            const lastTx = transactions[transactions.length - 1];
            return await getTransactions(time, lastTx.lt.toString(), lastTx.hash().toString("hex"), 0);
        }


        let isProcessing = false;

        const tick = async () => {
            if (isProcessing) return;
            isProcessing = true;

            try {
                const result = await getTransactions(0, undefined, undefined, 0);
                if (result > 0) {
                    this.startTime = result; // store in your database
                }
            } catch (e) {
                console.error(e);
            }

            isProcessing = false;
        }

        setInterval(tick, 5 * 1000); 
        tick();
    }
}