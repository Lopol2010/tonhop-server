import { Abi, BlockTag, ContractEventName, ExtractAbiItem, GetContractEventsReturnType, Log, createPublicClient, http, parseUnits } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
// import env from './utils/env';
import { EVMEvenLogId, TransferDetailsTONChain, } from './utils/TransferDetails';
import { isValidTonAddress, isTestnetAddress, convertDecimals } from './utils/utils';
import { networkConfig } from './networkConfig';
import { getBlock, getTransaction, getTransactionReceipt } from 'viem/actions';
import mongoose from 'mongoose';
import { TransferRequestFromEVMModel } from './models/TransferRequest';
const PQueue = require('p-queue').default;

export type BridgedLog = Log<bigint, number, boolean, undefined, boolean, typeof networkConfig.bsc.bridgeAbi, 'Bridged'>;
export async function validateEventLogs(logs: BridgedLog[]) {
    let transferDetailsArray: TransferDetailsTONChain[] = [];
    for (let i = 0; i < logs.length; i++) {
        let log = logs[i];
        if (log.removed) {
            // TODO: handle chain reorgs, for example wait for confirmations to avoid reorgs at all
            console.warn("Skipping removed log: ", log);
            continue;
        }

        if (log.blockHash == null || log.transactionHash == null || log.logIndex == null) {
            console.warn("Skipping log from pending tx: ", log);
            continue;
        }

        let { args: { user, amount, destination } } = log;

        if (!user || !amount || !destination) {
            console.warn("Skipping log with missing args: ", log);
            continue;
        }

        if (!isValidTonAddress(destination)) {
            console.warn("Skipping invalid TON address: ", destination);
            continue;
        }

        if (networkConfig.ton.network === "mainnet" && isTestnetAddress(destination)) {
            console.warn("Skipping transfer to address with test flag while bridge wallet is on mainnet: ", destination);
            continue;
        }

        let amountToTransferToncoins = convertDecimals(amount, networkConfig.bsc.wtonDecimals, networkConfig.ton.tonDecimals);
        let minAmountToTransferToncoins = parseUnits(networkConfig.bsc.minAmount, networkConfig.ton.tonDecimals);
        if (amountToTransferToncoins < minAmountToTransferToncoins) {
            console.warn("Skipping log with too small amount: ", log);
            continue;
        }

        let isTransferAlreadyProcessed = await TransferRequestFromEVMModel.existsByLog(log);

        if(isTransferAlreadyProcessed) {
            console.warn("Skipping log that's already processed: ", log);
            continue;
        }

        transferDetailsArray.push({
            to: destination,
            value: amountToTransferToncoins,
            sourceLog: {
                blockHash: log.blockHash,
                transactionHash: log.transactionHash,
                logIndex: log.logIndex
            }
        })
    }
    return transferDetailsArray;
}