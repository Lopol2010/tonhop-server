import { getHttpEndpoint } from "@orbs-network/ton-access";
import { KeyPair, mnemonicToWalletKey } from "@ton/crypto";
import { Address, OutActionSendMsg, SendMode, TonClient, internal, toNano } from "@ton/ton";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { HighloadQueryId } from "./HighloadQueryId";
import { HighloadWalletV3 } from "./HighloadWalletV3";
import env from "../utils/env";
import axios, { Axios } from "axios";
import { setTimeout } from "timers/promises";
import { networkConfig } from "../networkConfig";
import { isTestnetAddress, isValidTonAddress as isValidTonAddress } from "../utils/utils";
import { Log } from "viem";

export type TransferDetailsArray = Array<{
    to: string,
    value: bigint,
    sourceLog: {
        blockNumber: bigint,
        blockHash: `0x${string}`,
        transactionHash: `0x${string}`,
        logIndex: number,
    }
}>;

export let HighloadWalletV3Wrapper = (() => {
    let instance: {
        getQueryId: () => bigint;
        getBalance: () => Promise<bigint>;
        sendBatch: (transfers: TransferDetailsArray) => Promise<void>;
    };

    const getInstance = async () => {
        if (!instance) {
            instance = await initializeInstance();
        }
        return instance;
    }

    return {
        getInstance
    }
})();

async function initializeInstance() {

    let key = networkConfig.keyPair;
    let highloadAddress = networkConfig.ton.highloadWalletAddress;

    const wallet = HighloadWalletV3.createFromAddress(highloadAddress);

    const endpoint = await getHttpEndpoint({ network: networkConfig.ton.network });
    const client = new TonClient({ endpoint });

    const walletContract = client.open(wallet);

    if (!await client.isContractDeployed(wallet.address)) {
        throw Error("[HighloadWallet] wallet is not deployed!");
    }

    console.log("[HighloadWallet] balance:", await client.getBalance(highloadAddress));

    // TODO: save this in DB?
    let queryId = new HighloadQueryId();
    let queryIdFromFile = await readFile(path.normalize("./queryId.txt"), "utf8");
    queryId = HighloadQueryId.fromQueryId(BigInt(queryIdFromFile));

    return {
        getQueryId: () => {
            return queryId.getQueryId();
        },
        getBalance: async () => {
            return await client.getBalance(highloadAddress);
        },
        sendBatch: async (transfers: TransferDetailsArray) => {
            transfers.forEach(item => console.log(`[HighloadWallet] will send ${item.value} to ${item.to}`));

            let currentQueryId = queryId;
            queryId = queryId.hasNext() ? queryId.getNext() : new HighloadQueryId();
            await writeFile("./queryId.txt", queryId.getQueryId().toString(), "utf8");

            let messages = transfers.map(({ to, value, sourceLog }) => {
                return {
                    type: "sendMsg",
                    mode: SendMode.NONE,
                    outMsg: internal({
                        to: to,
                        value: value,
                        bounce: false,
                        body: sourceLog.blockHash + sourceLog.transactionHash + sourceLog.logIndex
                    })
                } as OutActionSendMsg
            })

            try {
                await walletContract.sendBatch(
                    key.secretKey,
                    messages,
                    4269,
                    currentQueryId,
                    120,
                    Math.floor(Date.now() / 1000) - 30,
                    undefined
                );
            } catch (error) {
                if (error instanceof axios.AxiosError) {
                    error.response
                        ? console.log(error.response.status, error.response.statusText, error.response.data)
                        : console.log(error);
                } else {
                    console.log("[HighloadWallet] error:", error);
                }
            }
        }
    }
}