import { Address } from "@ton/ton";
import env from "./utils/env";
import { Network } from "@orbs-network/ton-access";
import { bsc, bscTestnet, Chain, hardhat } from "viem/chains";
import { KeyPair, keyPairFromSecretKey, mnemonicToWalletKey } from "@ton/crypto";

import { bridgeAbi } from "./abi/BridgeContract";

export type NetworkConfigInterface = {
    ton: {
        network: Network,
        highloadWalletAddress: Address,
        tonDecimals: number,
    },
    bsc: {
        chain: Chain,
        rpcUrl: string,
        minAmount: string,
        wtonDecimals: number,
        wtonAddress: `0x${string}`,
        bridgeAddress: `0x${string}`,
        bridgeAbi: typeof bridgeAbi,
    }
}

let configs: { [id: string]: NetworkConfigInterface } = {
    development: {
        ton: {
            network: "testnet",
            // testnet, owner is my keypair
            highloadWalletAddress: Address.parse("0QDzVut2kivyZv6W916A58ilS7AvjtvtuwltVGRqpiWbwgLO"),
            tonDecimals: 9
        },
        bsc: {
            chain: env.MODE ? hardhat : bscTestnet,
            // rpcUrl: "https://bsc-testnet-rpc.publicnode.com",
            rpcUrl: bscTestnet.rpcUrls.default.http[0],
            minAmount: "0.05",
            wtonDecimals: env.MODE ? 9 : 18,
            wtonAddress: "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee",
            bridgeAbi: bridgeAbi,
            bridgeAddress: "0xa9C1C70692E530AfbB2A09Dac3741D6449f16D2c"
        }
    },
    production: {
        ton: {
            network: "mainnet",
            // mainnet, owner is Alex's keypair
            highloadWalletAddress: Address.parse("EQDbm_PjuTsS2eUwaqcESuOqkiTBNIZrB5R12g54lBsQ7S5m"),
            tonDecimals: 9,
        },
        bsc: {
            chain: bsc,
            rpcUrl: "",
            minAmount: "0.05",
            wtonDecimals: 9,
            wtonAddress: "0x76A797A59Ba2C17726896976B7B3747BfD1d220f",
            bridgeAbi: bridgeAbi,
            bridgeAddress: "0xCE3878b823c3207AE698C5D7eC45DA162727022F"
        }
    }
}

export const networkConfig = configs[env.NODE_ENV];
