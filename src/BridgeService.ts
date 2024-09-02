import { BNBWatcher } from './BNB/BNBWatcher';
import { TONSender } from './TON/TONSender';
import { BridgedLog, validateEventLogs as filterInvalidLogs } from './BNB/LogValidation';
import { printTransferDetails } from './utils/utils';
import { BNBSender } from './BNB/BNBSender';
import { TONWatcher } from './TON/TONWatcher';
import { Address, Transaction } from '@ton/core';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { networkConfig } from './networkConfig';
import { TonClient } from '@ton/ton';
import { LastFetchedTONTransactionModel } from './models/LastFetchedTONTransaction';
import { Chain, TransferRequestFromEVMModel, TransferRequestFromTONModel, TransferRequestStatus } from './models/TransferRequest';
import { validateTONTransaction } from './TON/TONTransactionValidation';
import env from './utils/env';


export class BridgeService {

  private tonWatcher: TONWatcher;
  private tonSender: TONSender;
  private bnbWatcher: BNBWatcher;
  private bnbSender: BNBSender;
  private queue: any;

  private constructor(tonWatcher: TONWatcher, tonSender: TONSender, bnbWatcher: BNBWatcher, bnbSender: BNBSender, queue: any) {
    this.tonWatcher = tonWatcher;
    this.tonSender = tonSender;
    this.bnbWatcher = bnbWatcher;
    this.bnbSender = bnbSender;
    this.queue = queue;
  }

  public static async create(): Promise<BridgeService> {
    // const endpoint = await getHttpEndpoint({ network: networkConfig.ton.network });
    const endpoint = "https://toncenter.com/api/v2/jsonRPC";
    const client = new TonClient({ endpoint, apiKey: env.TONCENTER_API_KEY });

    let lastFetchedTONTransaction = await LastFetchedTONTransactionModel.get();

    // If not found lastFetchedTONTransaction in DB, then use current time to filter out old transactions!
    let oldestTONTransactionTime = 0;
    if(lastFetchedTONTransaction == null) {
      oldestTONTransactionTime = Math.floor(Date.now() / 1000)
    }
    const tonWatcher = await TONWatcher.create({
      client,
      accountAddress: networkConfig.ton.highloadWalletAddress,
      pollInterval: 3 * 1000,
      startTransactionLT: lastFetchedTONTransaction ? lastFetchedTONTransaction.lt : undefined,
      startTransactionHash: lastFetchedTONTransaction ? lastFetchedTONTransaction.hash : undefined,
      oldestTONTransactionTime,
      onNewStartTransaction: async (newStartLT, newStartHash) => {
        await LastFetchedTONTransactionModel.update({ lt: newStartLT, hash: newStartHash });
      }
    });
    const tonSender = await TONSender.create(client, networkConfig.ton.highloadWalletAddress);

    const bnbWatcher = new BNBWatcher();
    const bnbSender = new BNBSender();

    const PQueue = require('p-queue').default;
    const queue = new PQueue({ concurrency: 1 }); // must process one-by-one
    const instance = new BridgeService(tonWatcher, tonSender, bnbWatcher, bnbSender, queue);
    return instance;
  }

  public async start() {
    this.bnbWatcher.retrieveMissedLogs(this.handleBCSToTONTransfer.bind(this))
    this.bnbWatcher.startWatching(this.handleBCSToTONTransfer.bind(this));

    this.tonWatcher.start(this.handleTONToBNBTransfer.bind(this));
  }

  async handleTONToBNBTransfer(tx: Transaction) {
    this.queue.add(async () => {
      try {
        let transferDetails = await validateTONTransaction(tx);

        if (transferDetails == null) {
          return;
        }

        try {
          await TransferRequestFromTONModel.createFromTransaction(tx);
        } catch (error) {
          console.log(`Transfer skipped, failed to create document`, error);
          return;
        }

        await this.bnbSender.sendWTON(transferDetails);
      } catch (error) {
        console.log("Unexpected error when processing transfer: ", error);
      }
    })
  }

  async handleBCSToTONTransfer(logs: BridgedLog[]) {

    this.queue.add(async () => {
      try {

        let transferDetailsArray = await filterInvalidLogs(logs);

        // printTransferDetails(transferDetailsArray);

        let results = await Promise.allSettled(transferDetailsArray.map(item => {
          return TransferRequestFromEVMModel.fromTransferDetails(item);
        }));

        results.forEach(item => {
          if (item.status == 'rejected') {
            console.log("Failed to create document with error:", item.reason);
          }
        })

        // keep processing transfers for which DB document is created
        transferDetailsArray = transferDetailsArray.filter((_, i) => results[i].status == "fulfilled");

        if (transferDetailsArray.length > 0) {
          try {
            await this.tonSender.sendBatch(transferDetailsArray);
            await TransferRequestFromEVMModel.setStatusMany(transferDetailsArray, TransferRequestStatus.COMPLETED);
          } catch (error) {
            console.log("Failed to send batch with error:", error);
            await TransferRequestFromEVMModel.setStatusMany(transferDetailsArray, TransferRequestStatus.FAILED);
          }
        }
      } catch (error) {
        console.log("Unexpected error when processing transfer: ", error);
      }
    });

  }

}