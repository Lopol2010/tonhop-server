import { Address } from "@ton/ton";
import { parseUnits } from "viem";


export let parseWTON = (amount: string) => parseUnits(amount, 9);

/// returns true if address belongs to mainnet and basechain
export function validateTonAddress(address: string, allowTestnet: boolean = false) {

    try {
        let {workChain} = Address.parse(address);
        // discard masterchain for now
        if(workChain != 0) {
            return false;
        }
    } catch (error) {
        return false;
    }

    if(allowTestnet) return true;

    if(Address.isFriendly(address)) {
        let { isTestOnly } = Address.parseFriendly(address);
        // discard testnet address
        return !isTestOnly;
    }

    return true;
}