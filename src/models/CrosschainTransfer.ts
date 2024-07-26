import { BridgedLog } from '@/LogValidation';
import { TransferDetailsArray } from '@/utils/TransferDetailsArray';
import {
    DocumentType,
    ReturnModelType,
    Severity,
    getModelForClass,
    index,
    modelOptions,
    prop,
} from '@typegoose/typegoose'

export type TransferStatus = "pending" | "completed" | "failed";

export type TransferOriginTON = {
    chain: "TON",
    hash: string,
    lt: string
}

export type TransferOriginBNB = {
    chain: "BNB",
    blockHash: `0x${string}`,
    transactionHash: `0x${string}`,
    logIndex: number
}

export type TransferOriginChain = "BNB" | "TON";

export type TransferOrigin = {
    chain: TransferOriginChain
} & (TransferOriginTON | TransferOriginBNB);

@modelOptions({
    schemaOptions: { timestamps: true },
    options: { allowMixed: Severity.ALLOW }
})
export class CrosschainTransfer {

    @prop({ required: true })
    status!: TransferStatus

    @prop({ required: true })
    origin!: TransferOrigin

    public static async setStatusMany(this: ReturnModelType<typeof CrosschainTransfer>, logsData: TransferDetailsArray, status: TransferStatus) {
        let filter_allCurrentLogs = { $or: logsData.map(log => log.sourceLog) };
        let update = { $set: { status } };
        await CrosschainTransferModel.updateMany(filter_allCurrentLogs, update);
    }

    public static async existsByLog(this: ReturnModelType<typeof CrosschainTransfer>, log: BridgedLog) {
        return (await CrosschainTransferModel.exists({
            origin: {
                chain: "BNB",
                blockHash: log.blockHash,
                transactionHash: log.transactionHash,
                logIndex: log.logIndex
            }
        })) != null;
    }

    public static async findLastByOriginChain<T extends TransferOriginChain>(this: ReturnModelType<typeof CrosschainTransfer>, originChain: T) {
        let document = await CrosschainTransferModel.findOne<CrosschainTransfer & { origin: { chain: T } }>(
            { "origin.chain": originChain },
            null,
            { sort: { _id: -1 } }
        ).exec();
        return document;
    }
}

export const CrosschainTransferModel = getModelForClass(CrosschainTransfer)
