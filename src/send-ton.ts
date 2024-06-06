import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "@ton/crypto";
import { TonClient, WalletContractV4, internal } from "@ton/ton";
import env from "./env";

export type TransferDetailsArray = Array<{ to: string, value: bigint, logId: string }>;

export default async function manageTonWalletV4() {
    const key = await mnemonicToWalletKey(env.MNEMONIC.split(" "));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 })

    const endpoint = await getHttpEndpoint({ network: env.PRODUCTION ? "mainnet" : "testnet" });
    const client = new TonClient({ endpoint });

    const walletContract = client.open(wallet);

    if (!await client.isContractDeployed(wallet.address)) {
        throw Error("wallet is not deployed!");
    }

    let seqno = await walletContract.getSeqno();
    
    // TODO: what if message somehow not delivered or failed, thus nonce in contract wasn't incremented,
    //      then all next attempts to transfer tokens will fail... because contract validates myNonce===msgNonce
    return async (transfers: TransferDetailsArray) => {

        let messages = transfers.map( ({to, value, logId}) => {
            return internal({
                to: to,
                value: value,
                bounce: false,
                body: logId
            })
        })

        await walletContract.sendTransfer({
            secretKey: key.secretKey,
            seqno: seqno,
            messages: messages
        });

        seqno++;
    }
};