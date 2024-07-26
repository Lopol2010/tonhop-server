import { BNBWatcher } from './BNBWatcher';
import { TONSender } from './TONSender';
import { BridgedLog, validateEventLogs as filterInvalidLogs } from './LogValidation';
import { printTransferDetails } from './utils/utils';


export class BridgeService {

  private tonSender: TONSender;
  private bnbWatcher: BNBWatcher;
  private queue: any;

  private constructor(tonSender: TONSender, bnbWatcher: BNBWatcher, queue: any) {
    this.tonSender = tonSender;
    this.bnbWatcher = bnbWatcher;
    this.queue = queue;
  }

  public static async create(): Promise<BridgeService> {
    const tonSender = await TONSender.create();
    const bnbWatcher = new BNBWatcher();
    const PQueue = require('p-queue').default;
    const queue = new PQueue({ concurrency: 1 });
    const instance = new BridgeService(tonSender, bnbWatcher, queue);
    return instance;
  }

  public async start() {
    this.bnbWatcher.retrieveMissedLogs(this.handleBCSToTONTransfer.bind(this))
    this.bnbWatcher.startWatching(this.handleBCSToTONTransfer.bind(this));
  }

  async handleBCSToTONTransfer(logs: BridgedLog[]) {

    this.queue.add(async () => {
      let transferDetailsArray = await filterInvalidLogs(logs);

      printTransferDetails(transferDetailsArray);

      if (transferDetailsArray.length > 0) {
        try {
          await this.tonSender.sendBatch(transferDetailsArray);
        } catch (error) {
          console.log("Failed to send tokens:", error);
        }
      }
    });

  }

}