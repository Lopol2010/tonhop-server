import { Address } from "@ton/ton";
import { parseUnits } from "viem";


// export let parseWTON = (amountA: string) => parseUnits(amountA, 9);
export let convertDecimals = (amountA: bigint, decimalsA: number, decimalsB: number) => {
    if(decimalsA > decimalsB) {
        return amountA / (BigInt(10) ** BigInt(decimalsA - decimalsB));
    } else if(decimalsA < decimalsB) {
        return amountA * (BigInt(10) ** BigInt(decimalsB - decimalsA));
    }
    return amountA;
}

export function isValidTonAddress(address: string) {

    try {
        let {workChain} = Address.parse(address);
        // // discard masterchain for now
        // if(workChain != 0) {
        //     return false;
        // }
    } catch (error) {
        return false;
    }

    return true;
}

export function isTestnetAddress(address: string) {

    if(Address.isFriendly(address)) {
        let { isTestOnly } = Address.parseFriendly(address);
        return isTestOnly;
    }

    return false;
}