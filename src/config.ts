import { Address } from "@ton/ton";
import env from "./env";
import { Network } from "@orbs-network/ton-access";
import { bsc, bscTestnet } from "viem/chains";
import { KeyPair, keyPairFromSecretKey, mnemonicToWalletKey } from "@ton/crypto";

let isDev = env.ENVIRONMENT === "dev";

export let config: ConfigInterface = {
    keyPair: isDev ?
        keyPairFromSecretKey(Buffer.from(env.PRIVATE_KEY_DEV, "hex")) :
        keyPairFromSecretKey(Buffer.from(env.PRIVATE_KEY, "hex")),
    ton: {
        network: isDev ? "testnet" : "mainnet",
        highloadWalletAddress: isDev ?
            // testnet, owner is me
            Address.parse("0QDzVut2kivyZv6W916A58ilS7AvjtvtuwltVGRqpiWbwgLO") :
            // mainnet, owner is Alex's keypair
            Address.parse("EQDbm_PjuTsS2eUwaqcESuOqkiTBNIZrB5R12g54lBsQ7S5m"),
        tonDecimals: 9

    },
    bsc: {
        chain: isDev ? bscTestnet : bsc,
        // chain: env.ENVIRONMENT==="dev" ? hardhat : bsc,
        wtonDecimals: isDev ? 18 : 9,
        // wtonDecimals: 18,
        minAmount: "0.05",

    }
}

type ConfigInterface = {
    keyPair: KeyPair,
    ton: {
        network: Network,
        highloadWalletAddress: Address,
        tonDecimals: number
    },
    bsc: {
        chain: any,
        wtonDecimals: number,
        minAmount: string
    }
}