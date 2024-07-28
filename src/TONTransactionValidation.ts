import { Address, Slice, TonClient, Transaction } from '@ton/ton';
import { convertDecimals, wait } from './utils/utils';
import axios from 'axios';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { isAddress, parseUnits } from 'viem';
import { TransferDetailsBNBChain } from './utils/TransferDetails';
import { networkConfig } from './networkConfig';
import { TransferRequestFromTONModel } from './models/TransferRequest';

export async function validateTONTransaction(tx: Transaction) {
    if (!tx.inMessage || tx.inMessage.info.type != "internal") return null;

    const inMsgInfo = tx.inMessage.info;
    const inMsg = tx.inMessage;

    let payloadString;
    try {
        payloadString = inMsg.body.beginParse().loadStringTail();
        if (inMsg.body.beginParse().remainingRefs == 1) {
            payloadString += inMsg.body.beginParse().loadStringRefTail();
        }
    } catch (error) { return; }
    // remove 4 bytes of zeroes (string payload prefix)
    payloadString = payloadString.trim().slice(4);

    const destinationAddress = payloadString;

    if (!isAddress(destinationAddress, { strict: false })) {
        console.warn("Skipping message with invalid destination address: ", destinationAddress);
        return null;
    }

    let amountToncoin = inMsgInfo.value.coins;
    let amountToTransferWTON = convertDecimals(amountToncoin, networkConfig.ton.tonDecimals, networkConfig.bsc.wtonDecimals);
    let minAmountToTransferToncoins = parseUnits(networkConfig.bsc.minAmount, networkConfig.ton.tonDecimals);
    if (amountToTransferWTON < minAmountToTransferToncoins) {
        console.warn("Skipping message with too small amount: ", amountToncoin);
        return null;
    }

    let isAlreadyProcessed = await TransferRequestFromTONModel.existsByTransaction(tx);

    if (isAlreadyProcessed) {
        console.warn("Skipping message that's already processed: ", tx.lt, tx.hash().toString("base64"));
        return null;
    }

    return {
        to: destinationAddress as `0x${string}`,
        value: amountToTransferWTON,
        sourceTx: {
            lt: tx.lt.toString(),
            hash: tx.hash().toString("base64")
        }
    } as TransferDetailsBNBChain;
}
