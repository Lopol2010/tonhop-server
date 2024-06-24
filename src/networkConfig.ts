import { Address } from "@ton/ton";
import env from "./utils/env";
import { Network } from "@orbs-network/ton-access";
import { bsc, bscTestnet, hardhat } from "viem/chains";
import { KeyPair, keyPairFromSecretKey, mnemonicToWalletKey } from "@ton/crypto";

export type NetworkConfigInterface = {
    keyPair: KeyPair,
    ton: {
        network: Network,
        highloadWalletAddress: Address,
        tonDecimals: number
    },
    bsc: {
        chain: any,
        rpcUrl: string,
        wtonDecimals: number,
        minAmount: string
    }
}

export let configs: { [id: string]: NetworkConfigInterface } = {
    development: {
        keyPair: keyPairFromSecretKey(Buffer.from(env.PRIVATE_KEY, "hex")),
        ton: {
            network: "testnet",
            // testnet, owner is my keypair
            highloadWalletAddress: Address.parse("0QDzVut2kivyZv6W916A58ilS7AvjtvtuwltVGRqpiWbwgLO"),
            tonDecimals: 9
        },
        bsc: {
            chain: env.MODE ? hardhat : bscTestnet,
            rpcUrl: "https://bsc-testnet-rpc.publicnode.com",
            wtonDecimals: env.MODE ? 9 : 18,
            minAmount: "0.05",
        }
    },
    production: {
        keyPair: keyPairFromSecretKey(Buffer.from(env.PRIVATE_KEY, "hex")),
        ton: {
            network: "mainnet",
            // mainnet, owner is Alex's keypair
            highloadWalletAddress: Address.parse("EQDbm_PjuTsS2eUwaqcESuOqkiTBNIZrB5R12g54lBsQ7S5m"),
            tonDecimals: 9
        },
        bsc: {
            chain: bsc,
            rpcUrl: "",
            wtonDecimals: 9,
            minAmount: "0.05",
        }
    }
}

export const networkConfig = configs[env.NODE_ENV];