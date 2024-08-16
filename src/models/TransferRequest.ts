import { BridgedLog } from '@/BNB/LogValidation';
import { TransferDetailsBNBChain, TransferDetailsTONChain } from '@/utils/TransferDetails';
import { Transaction } from '@ton/core';
import {
    DocumentType,
    ReturnModelType,
    Severity,
    getModelForClass,
    index,
    modelOptions,
    prop,
} from '@typegoose/typegoose'

export enum TransferRequestStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
}


export enum Chain {
    BNB = "BNB",
    TON = "TON",
}

@modelOptions({
    schemaOptions: { timestamps: true },
})
export class TransferRequestFromEVM {

    @prop({ required: true, enum: TransferRequestStatus })
    status!: TransferRequestStatus
    @prop({ required: true, enum: Chain })
    chain!: Chain;
    @prop({ required: true })
    blockHash!: `0x${string}`;
    @prop({ required: true })
    transactionHash!: `0x${string}`;
    @prop({ required: true })
    logIndex!: number;

    public static async setStatusMany(
        this: ReturnModelType<typeof TransferRequestFromEVM>,
        logsData: TransferDetailsTONChain[],
        newStatus: TransferRequestStatus
    ) {
        await TransferRequestFromEVMModel.updateMany(
            { $or: logsData.map(log => { return { chain: Chain.BNB, ...log.sourceLog } }) },
            { $set: { status: newStatus } }
        );
    }

    public static async existsByLog(this: ReturnModelType<typeof TransferRequestFromEVM>, log: BridgedLog) {
        return (await TransferRequestFromEVMModel.exists({
            chain: Chain.BNB,
            blockHash: log.blockHash,
            transactionHash: log.transactionHash,
            logIndex: log.logIndex
        })) != null;
    }

    public static async fromTransferDetails(this: ReturnModelType<typeof TransferRequestFromEVM>, transferDetails: TransferDetailsTONChain) {
        await TransferRequestFromEVMModel.create({
            status: TransferRequestStatus.PENDING,
            chain: Chain.BNB,
            ...transferDetails.sourceLog,
        } as TransferRequestFromEVM);
    }

    public static async findLast(this: ReturnModelType<typeof TransferRequestFromEVM>, chain: Chain) {
        return await TransferRequestFromEVMModel.findOne({ chain }, null, { sort: { _id: -1 } }).exec();
    }
}

export class TransferRequestFromTON {

    @prop({ required: true, enum: TransferRequestStatus })
    status!: TransferRequestStatus
    @prop({ required: true, enum: Chain })
    chain!: Chain;
    @prop({ required: true })
    hash!: string;
    @prop({ required: true })
    lt!: string;

    public static async findByTransactionId(this: ReturnModelType<typeof TransferRequestFromTON>, lt: string, hash: string) {
        return await TransferRequestFromTONModel.findOne({ lt, hash }, null, {}).exec();
    }

    public static async createFromTransaction(this: ReturnModelType<typeof TransferRequestFromTON>, tx: Transaction) {
        return await TransferRequestFromTONModel.create({
            status: TransferRequestStatus.PENDING,
            chain: Chain.TON,
            lt: tx.lt,
            hash: tx.hash().toString("base64")
        });
    }

    public static async setStatus(this: ReturnModelType<typeof TransferRequestFromTON>, lt: string, hash: string, newStatus: TransferRequestStatus) {
        await TransferRequestFromTONModel.findOneAndUpdate({ lt, hash }, { $set: { status: newStatus } }).exec();
    }

    public static async existsByTransaction(this: ReturnModelType<typeof TransferRequestFromTON>, transaction: Transaction) {
        let document = await TransferRequestFromTONModel.exists({
            "lt": transaction.lt,
            "hash": transaction.hash().toString("base64")
        }).exec();
        return document != null;
    }
}

export const TransferRequestFromEVMModel = getModelForClass(TransferRequestFromEVM)
export const TransferRequestFromTONModel = getModelForClass(TransferRequestFromTON)
