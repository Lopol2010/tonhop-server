import { TransferDetailsArray } from '@/HighloadWalletV3/HighloadWalletV3Wrapper'
import { watchBridgeForEventLogs } from '@/watch-bridge'
import { createTestClient, erc20Abi, getContract, http, parseEventLogs, parseUnits, publicActions, walletActions } from 'viem'
import { hardhat } from 'viem/chains'
import { networkConfig } from '../networkConfig'

describe('Tests', () => {

  let snapshotId: `0x${string}`;

  const WTON_TREASURY = "0x5345ae488B9AdeA607175956F7d41f0871116cc7";
  const BRIDGE_OWNER = "0xdC12ea64fbe3A96a4AC47113F63E42d6de162A77";

  let onLogsCallback = jest.fn((transfers: TransferDetailsArray) => {
    console.log("created transfers", transfers);
  });
  let unwatch = watchBridgeForEventLogs(onLogsCallback, 5);

  let client = createTestClient({
    mode: "hardhat",
    chain: hardhat,
    transport: http(),
    cacheTime: 0
  })
    .extend(publicActions)
    .extend(walletActions);


  let wton = getContract({
    address: networkConfig.bsc.wtonAddress,
    abi: erc20Abi,
    client: client
  });
  let bridge = getContract({
    address: networkConfig.bsc.bridgeAddress,
    abi: networkConfig.bsc.bridgeAbi,
    client: client
  });

  beforeAll(async () => {

    // temp fix: https://github.com/NomicFoundation/edr/issues/447#issuecomment-2125163333
    await client.mine({ blocks: 1, });

    await client.impersonateAccount({
      address: WTON_TREASURY
    });

    await wton.write.approve([networkConfig.bsc.bridgeAddress, parseUnits("100000", networkConfig.bsc.wtonDecimals)], {
      account: WTON_TREASURY
    });
  })

  beforeEach(async () => {
    snapshotId = await client.snapshot();
  })

  afterEach(async () => {
    await client.revert({ id: snapshotId });
  })

  afterAll(async () => {
    unwatch();
  })

  it('should ignore bad address', async () => {
    await bridge.write.bridge([parseUnits("1", networkConfig.bsc.wtonDecimals), "hahaha"], {
      account: WTON_TREASURY
    });
    await client.mine({ blocks: 1, });
    expect(onLogsCallback).not.toHaveBeenCalled();
  })

  it('should create transfer details', async () => {
    let value = parseUnits("1", networkConfig.bsc.wtonDecimals);
    let to = "UQC_pxTeZV0YIxOhOWRyJpuni-ab-68Akldrl6pvhZ3BcgV8";

    let tx = await bridge.write.bridge([value, to], {
      account: WTON_TREASURY
    });
    await client.mine({ blocks: 1, });

    // recreate logId
    let txReceipt = await client.getTransactionReceipt({ hash: tx });
    let logs = parseEventLogs({ abi: networkConfig.bsc.bridgeAbi, eventName: "Bridged", logs: txReceipt.logs });
    let logId = logs[0].blockHash + logs[0].transactionHash + logs[0].logIndex;
    // console.log(logs);

    expect(onLogsCallback).toHaveBeenCalledWith([{
      to, value, sourceLog: {
        blockHash: logs[0].blockHash,
        transactionHash: logs[0].transactionHash,
        logIndex: logs[0].logIndex,
      }
    }]);
  })

  it('should create multiple transfer details', async () => {

    await client.setAutomine(false);
    // await client.setIntervalMining({ interval: 0 });

    let value = parseUnits("1", networkConfig.bsc.wtonDecimals);
    let to = "UQC_pxTeZV0YIxOhOWRyJpuni-ab-68Akldrl6pvhZ3BcgV8";
    let tx = await bridge.write.bridge([value, to], {
      account: WTON_TREASURY
    });

    let value2 = parseUnits("2", networkConfig.bsc.wtonDecimals);
    let to2 = "UQC_pxTeZV0YIxOhOWRyJpuni-ab-68Akldrl6pvhZ3BcgV8";
    let tx2 = await bridge.write.bridge([value2, to2], {
      account: WTON_TREASURY
    });

    await client.setAutomine(true);
    await client.mine({ blocks: 1 });

    let logId = await makeLogID(tx);
    let logId2 = await makeLogID(tx2);

    // ATTENTION: set 'gas: auto' in hardhat network config 
    expect(onLogsCallback).toHaveBeenCalledWith([{
      to, value, logId
    }, {
      to: to2, value: value2, logId: logId2
    }]);
  })

  it('123', async () => {

    let logs222 = await client.getContractEvents({
        abi: networkConfig.bsc.bridgeAbi,
        address: networkConfig.bsc.bridgeAddress,
        eventName: "Bridged",
        fromBlock: 39451418n,
        toBlock: 39451418n,
        // fromBlock: 39387811n,
        // toBlock: 39388130n
        // toBlock: 39417811n
        // toBlock: 39730059n,
        // toBlock: "latest"
    });
    // const unwatch = client.watchContractEvent(
    //   {
    //     abi: bridgeAbi,
    //     address: bridgeAddress,
    //     eventName: "Bridged",
    //     fromBlock: 39387811n,
    //     onLogs: lg=> console.log(lg),
    //   }
    // );

    console.log(logs222);
  })

  async function makeLogID(tx: `0x${string}`) {
    let txReceipt = await client.getTransactionReceipt({ hash: tx });
    let logs = parseEventLogs({ abi: networkConfig.bsc.bridgeAbi, eventName: "Bridged", logs: txReceipt.logs });
    let logId = logs[0].blockHash + logs[0].transactionHash + logs[0].logIndex;
    return logId;
  }
})