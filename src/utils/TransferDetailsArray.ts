
export type LogIdFull = {
    blockHash: `0x${string}`,
    transactionHash: `0x${string}`,
    logIndex: number,
};

export type TransferDetailsArray = Array<{
    to: string,
    value: bigint,
    sourceLog: LogIdFull
}>;
