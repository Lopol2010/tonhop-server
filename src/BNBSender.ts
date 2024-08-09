import { Account, Block, Client, HDAccount, HttpTransport, ParseAccount, PublicClient, WalletClient, createClient, createPublicClient, createWalletClient, erc20Abi, formatUnits, http, publicActions, walletActions } from 'viem';
// import env from './utils/env';
import { networkConfig, NetworkConfigInterface } from './networkConfig';
import { TransferRequestFromEVMModel, TransferRequestFromTONModel, TransferRequestStatus } from './models/TransferRequest';
import { BridgedLog } from './LogValidation';
import { TransferDetailsBNBChain } from './utils/TransferDetails';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import env from './utils/env';


export class BNBSender {
 
    private walletClient: WalletClient<HttpTransport, typeof networkConfig.bsc.chain, Account, undefined>;
    private publicClient: PublicClient<HttpTransport, typeof networkConfig.bsc.chain, Account, undefined>;

    constructor() {
        const account = privateKeyToAccount(env.BNB_HOTWALLET_PRIVATE_KEY);

        console.log(`[BNBSender] Connected to hot wallet ${account.address}`);

        this.walletClient = createWalletClient({
            account,
            chain: networkConfig.bsc.chain,
            transport: http(networkConfig.bsc.rpcUrl),
        });
        this.publicClient = createPublicClient({
            chain: networkConfig.bsc.chain,
            transport: http(networkConfig.bsc.rpcUrl),
        });
    }

    public async sendWTON(transferDetails: TransferDetailsBNBChain) {

        console.log(`[BNBSender] Will send ${formatUnits(transferDetails.value, networkConfig.bsc.wtonDecimals)} to ${transferDetails.to}`);

        try {
            let { request } = await this.publicClient.simulateContract({
                account: this.walletClient.account,
                address: networkConfig.bsc.wtonAddress,
                abi: erc20Abi,
                functionName: "transfer",
                // TODO: add validation of inputs? though maybe simulatContract is enough validation
                args: [transferDetails.to, transferDetails.value]
            });

            // TODO: make sure nonce is managed correctly
            await this.walletClient.writeContract(request);

            await TransferRequestFromTONModel.setStatus(transferDetails.sourceTx.lt, transferDetails.sourceTx.hash, TransferRequestStatus.COMPLETED)
        } catch (error) {
            await TransferRequestFromTONModel.setStatus(transferDetails.sourceTx.lt, transferDetails.sourceTx.hash, TransferRequestStatus.FAILED)
            console.log("[BNBSender] Error when sending transaction: ", error);
        }
    }
}
