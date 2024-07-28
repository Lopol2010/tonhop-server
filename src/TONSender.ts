// import env from './utils/env';
import { TransferDetailsTONChain } from './utils/TransferDetails';
import mongoose from 'mongoose';
import { Chain, TransferRequestFromEVM, TransferRequestFromEVMModel, TransferRequestStatus } from './models/TransferRequest';
import { getLastQueryId, getNextQueryId } from './models/QueryIdModel';
import { formatUnits, parseUnits } from 'viem';
import { networkConfig } from './networkConfig';
import { KeyPair, keyPairFromSecretKey } from '@ton/crypto';
import env from './utils/env';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { HighloadWalletV3 } from './HighloadWalletV3/HighloadWalletV3';
import { Address, internal, OpenedContract, OutActionSendMsg, SendMode, TonClient } from '@ton/ton';
import { HighloadQueryId } from './HighloadWalletV3/HighloadQueryId';
import axios from 'axios';


export class TONSender {

  private client: TonClient;
  private queryId: HighloadQueryId;
  private walletContract: OpenedContract<HighloadWalletV3>;

  private constructor(lastQueryId: HighloadQueryId, wallet: OpenedContract<HighloadWalletV3>, client: TonClient) {
    this.queryId = lastQueryId;
    this.walletContract = wallet;
    this.client = client;
  }

  public static async create(client: TonClient, highloadAddress: Address, keyPair?: KeyPair): Promise<TONSender> {

    const wallet = HighloadWalletV3.createFromAddress(highloadAddress);

    const walletContract = client.open(wallet);

    if (!await client.isContractDeployed(wallet.address)) {
      throw Error("[TONSender] wallet is not deployed!");
    }

    console.log("[TONSender] connected with balance:", await client.getBalance(highloadAddress));


    let queryId = await getLastQueryId(); // TODO: not incremented during sendbatch

    console.log("[TONSender] last query id:", queryId.toSeqno());

    const instance = new TONSender(queryId, walletContract, client);

    return instance;
  }

  public getQueryId() {
    return this.queryId.getQueryId();
  }

  public async getBalance() {
    return await this.client.getBalance(this.walletContract.address);
  }

  public async sendBatch(transfers: TransferDetailsTONChain[], keyPair?: KeyPair) {

    keyPair = keyPair || keyPairFromSecretKey(Buffer.from(env.PRIVATE_KEY, "hex"));

    if (!await this.hasEnoughBalance(transfers)) {
      throw new Error("Failed to send TON: not enough balance!");
    }

    let messages = transfers.map(({ to, value, sourceLog }) => {
      console.log(`[TONSender] will send ${formatUnits(value, networkConfig.ton.tonDecimals)} to ${to}`)
      return {
        type: "sendMsg",
        mode: SendMode.NONE,
        outMsg: internal({
          to: to,
          value: value,
          bounce: false,
          body: `${sourceLog.blockHash}${sourceLog.transactionHash}${sourceLog.logIndex}`
        })
      } as OutActionSendMsg
    })

    this.queryId = await getNextQueryId(this.queryId);
    try {
      await this.walletContract.sendBatch(
        keyPair.secretKey,
        messages,
        4269,
        this.queryId,
        120,
        Math.floor(Date.now() / 1000) - 30,
        undefined
      );

    } catch (error) {
      let newError = error;
      if (error instanceof axios.AxiosError && error.response) {
        newError = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        };
      }
      throw newError;
    }
  }

  async hasEnoughBalance(transferDetails: TransferDetailsTONChain[]) {
    let walletBalance = await this.getBalance();
    let totalTransferAmount = transferDetails.reduce((acc, cur) => {
      return acc + cur.value;
    }, 0n)
    // leftover amount to prevent contract deletion
    let unwithdrawableAmount = parseUnits("0.02", networkConfig.ton.tonDecimals);

    // check that wallet has enough balance
    return walletBalance >= (totalTransferAmount + unwithdrawableAmount);
  }
}