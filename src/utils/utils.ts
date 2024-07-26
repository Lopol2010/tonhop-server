import { TransferDetailsArray } from "@/utils/TransferDetailsArray";
import { Address } from "@ton/ton";
import { formatUnits, Log, parseUnits } from "viem";


// export let parseWTON = (amountA: string) => parseUnits(amountA, 9);
export let convertDecimals = (amountA: bigint, decimalsA: number, decimalsB: number) => {
    return parseUnits(formatUnits(amountA, decimalsA), decimalsB);
}

export function printTransferDetails(transferDetailsArray: TransferDetailsArray) {
    transferDetailsArray.forEach((transferDetails) => {
      const log = transferDetails.sourceLog;
      console.log(`\nTransfer Details:`);
      console.log(`\tblockHash: ${log.blockHash} \n\ttransactionHash: ${log.transactionHash} \n\tlogIndex: ${log.logIndex}`);
      console.log(`\tvalue: ${transferDetails.value}`)
      console.log(`\tto address: ${transferDetails.to}\n`)
    });
}

export function isValidTonAddress(address: string) {
    try {
        let {workChain} = Address.parse(address);
        return true;
    } catch (error) {
        return false;
    }
}

export function isTestnetAddress(address: string) {

    if(Address.isFriendly(address)) {
        let { isTestOnly } = Address.parseFriendly(address);
        return isTestOnly;
    }

    return false;
}

export const wait = (millis: number) => {
    return new Promise(resolve => {
        setTimeout(resolve, millis);
    });
}