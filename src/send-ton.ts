import { getHttpEndpoint } from "@orbs-network/ton-access";
import { KeyPair, mnemonicToWalletKey } from "@ton/crypto";
import { Address, OutActionSendMsg, SendMode, TonClient, internal, toNano } from "@ton/ton";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { HighloadQueryId } from "./HighloadQueryId";
import { HighloadWalletV3 } from "./HighloadWalletV3";
import env from "./env";
import axios, { Axios } from "axios";
import { setTimeout } from "timers/promises";
import { config } from "./config";
import { isTestnetAddress, isValidTonAddress as isValidTonAddress } from "./utils";

export type TransferDetailsArray = Array<{ to: string, value: bigint, logId: string }>;

export default async function highloadWalletV3Wrapper(key: KeyPair) {


    let highloadAddress = config.ton.highloadWalletAddress;

    const wallet = HighloadWalletV3.createFromAddress(highloadAddress);

    const endpoint = await getHttpEndpoint({ network: config.ton.network });
    const client = new TonClient({ endpoint });

    const walletContract = client.open(wallet);

    console.log("Connection to wallet in", config.ton.network);
    if (!await client.isContractDeployed(wallet.address)) {
        throw Error("wallet is not deployed!");
    }

    console.log("wallet balance:", await client.getBalance(highloadAddress));

    let queryId = new HighloadQueryId();
    try {
        let queryIdFromFile = await readFile(path.normalize("./queryId.txt"), "utf8");
        queryId = HighloadQueryId.fromQueryId(BigInt(queryIdFromFile));
    } catch (error) { }

    return async (transfers: TransferDetailsArray) => {
        console.log("sending batch transfers:", transfers);

        // TODO: collect transfers in batches and send them either when batch has max items or interval time passed
        let messages = transfers.map(({ to, value, logId }) => {
            return {
                type: "sendMsg",
                mode: SendMode.NONE,
                outMsg: internal({
                    to: to,
                    value: value,
                    bounce: false,
                    body: logId
                })
            } as OutActionSendMsg
        })
        // TODO: add checks somewhere that TON wallet has enough amount to transfer and even more to pay for storage!!
        try {
            await walletContract.sendBatch(
                key.secretKey,
                messages,
                4269,
                queryId,
                120,
                Math.floor(Date.now() / 1000) - 30,
                undefined
            );
        } catch (error) {
            if (error instanceof axios.AxiosError) {
                error.response ? console.log(error.response.status, error.response.statusText, error.response.data) : console.log(error);
            } else {
                console.log("error sending message to contract:", error);
            }
        }

        queryId = queryId.hasNext() ? queryId.getNext() : new HighloadQueryId();
        await writeFile("./queryId.txt", queryId.getQueryId().toString(), "utf8");
    }
};