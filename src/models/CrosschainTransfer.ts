import { TransferDetailsArray } from '@/HighloadWalletV3/HighloadWalletV3Wrapper';
import {
    DocumentType,
    ReturnModelType,
    getModelForClass,
    index,
    modelOptions,
    prop,
} from '@typegoose/typegoose'



export type CrosschainTransferStatus = "tokens_received" | "ton_msg_sent" | "success" | "failed";

@index({ blockHash: 1, transactionHash: 1, logIndex: 1 }, { unique: true })
@modelOptions({
    schemaOptions: { timestamps: true },
})
export class CrosschainTransfer {
    @prop({ required: true })
    blockNumber!: bigint

    @prop({ required: true })
    blockHash!: string
    @prop({ required: true })
    transactionHash!: string
    @prop({ required: true })
    logIndex!: number

    @prop({})
    highloadWalletQueryId!: bigint
    @prop({ required: true })
    status!: CrosschainTransferStatus

    public static async setStatusMany(this: ReturnModelType<typeof CrosschainTransfer>, logsData: TransferDetailsArray, status: CrosschainTransferStatus) {
        let filter_allCurrentLogs = { $or: logsData.map(log => log.sourceLog) };
        let update = { $set: { status } };
        await CrosschainTransferModel.updateMany(filter_allCurrentLogs, update);
    }
}

export const CrosschainTransferModel = getModelForClass(CrosschainTransfer)

export async function findOrCreateUser(loginOptions: {
    name: string
    email?: string
    facebookId?: string
    telegramId?: number
}) {
    const user = await CrosschainTransferModel.findOneAndUpdate(
        loginOptions,
        {},
        {
            new: true,
            upsert: true,
        }
    )
    if (!user) {
        throw new Error('User not found')
    }
    //   if (!user.token) {
    //     user.token = await sign({ id: user.id })
    //     await user.save()
    //   }
    return user
}