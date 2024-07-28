

export type EVMEvenLogId = {
    blockHash: `0x${string}`,
    transactionHash: `0x${string}`,
    logIndex: number,
};

// TODO: such structure and type-name doesn't look good if we'll have more chains and tokens to work with
export type TransferDetailsTONChain = {
    to: string,
    value: bigint,
    sourceLog: EVMEvenLogId
};

export type TONTransactionId = {
    lt: string,
    hash: string
};

export type TransferDetailsBNBChain = {
    to: `0x${string}`,
    value: bigint,
    sourceTx: TONTransactionId
};
