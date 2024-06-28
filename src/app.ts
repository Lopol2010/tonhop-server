import env from './utils/env'
import { HighloadWalletV3Wrapper, TransferDetailsArray } from './HighloadWalletV3/HighloadWalletV3Wrapper'
import { retrieveMissedLogs, watchBridgeForEventLogs } from './watch-bridge'
import { networkConfig } from './networkConfig'
import runMongo from './utils/runMongo'
import { CrosschainTransfer, CrosschainTransferModel } from './models/CrosschainTransfer'
import { parseUnits } from 'viem'
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server'
import { onShutdown } from 'node-graceful-shutdown'
import mongoose from 'mongoose'


// TODO: implement backtracking 
(async function () {
  console.log(`NODE_ENV = ${env.NODE_ENV}`);
  console.log(`BSC: ${networkConfig.bsc.chain.name}`);
  console.log(`TON: ${networkConfig.ton.network}`);
  console.log(`\n`);

  let db = await runMongo();
  // wait for build indexes to avoid race condition
  await CrosschainTransferModel.init();


  // TODO: maybe use blockNumber + transactionIndex + logIndex to find latest? 
  let lastProcessedLog = await CrosschainTransferModel.find().sort({ _id: -1 }).limit(1).exec();

  if (lastProcessedLog.length != 0) {
    try {
      await retrieveMissedLogs(lastProcessedLog[0], processBridgeEventLogs);
    } catch (error) {
      console.log("error backtrack:", error);
    }
  }

  watchBridgeForEventLogs(processBridgeEventLogs);
})()

async function processBridgeEventLogs(logsData: TransferDetailsArray) {

  let highloadWallet = await HighloadWalletV3Wrapper.getInstance();

  // let session = await mongoose.connection.startSession();
  try {
    await mongoose.connection.transaction(async (session) => {
      let documentsToCreate = logsData.map(transferInfo => {
        return {
          status: "ton_msg_sent",
          ...transferInfo.sourceLog,
        }
      });
      let transferModelsArray = await CrosschainTransferModel.create(
        documentsToCreate,
        { session }
      );
    });
  } catch (error) {
    console.log(error);
    return;
  }

  let walletBalance = await highloadWallet.getBalance();
  let totalTransferAmount = logsData.reduce((acc, cur) => {
    return acc + cur.value;
  }, 0n)
  // leftover amount to prevent contract deletion
  let unwithdrawableAmount = parseUnits("0.02", networkConfig.ton.tonDecimals);

  // check that wallet has enough balance
  if (walletBalance < totalTransferAmount + unwithdrawableAmount) {
    await CrosschainTransferModel.setStatusMany(logsData, "failed");
    return;
  }

  try {
    await highloadWallet.sendBatch(logsData);
    await CrosschainTransferModel.setStatusMany(logsData, "success");
  } catch (error) {
    console.log(error);
    await CrosschainTransferModel.setStatusMany(logsData, "failed");
  }

};


// (async function () {
//   console.log("NODE_ENV =", env.NODE_ENV);

//   let mongoServer = await MongoMemoryServer.create();
//   // const mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 4, storageEngine: 'wiredTiger' } }); // This will create an ReplSet with 4 members and storage-engine "wiredTiger"

//   let db = await runMongo(await mongoServer.getUri());
//   await CrosschainTransferModel.init();
//   let i = 0n;
//   async function op() {
//     // const session = await db.startSession();
//     try {

//       // await db.connection.transaction(async function executor() {

//         // if (await CrosschainTransferModel.findOne({
//         //   blockHash: "1",
//         //   transactionHash: "1",
//         //   logIndex: 1,
//         // // }).session(session)) {
//         // })) {
//         //   throw new Error("DUPLICATE");
//         // }

//         let transferDocuments = await CrosschainTransferModel.create(
//           [
//             {
//             status: "ton_msg_sent",
//             blockHash: "1",
//             transactionHash: "1",
//             logIndex: 1,
//             blockNumber: i
//           }
//           ,{
//             status: "ton_msg_sent",
//             blockHash: "1",
//             transactionHash: "1",
//             logIndex: 1,
//             blockNumber: i
//           }
//           ,{
//             status: "ton_msg_sent",
//             blockHash: "1x",
//             transactionHash: "1",
//             logIndex: 1,
//             blockNumber: i+1n
//           }
//           ,{
//             status: "ton_msg_sent",
//             blockHash: "1x",
//             transactionHash: "1",
//             logIndex: 1,
//             blockNumber: i+1n
//           }
//         ]
//           // {session}
//           // ,{ordered: false}
//         );
//         // let transferDocuments = await CrosschainTransferModel.findOneAndUpdate(
//         //   {
//         //     blockHash: "1",
//         //     transactionHash: "1",
//         //     logIndex: 1,
//         //   },
//         //   {

//         //     status: "ton_msg_sent",
//         //     blockHash: "1",
//         //     transactionHash: "1",
//         //     logIndex: 1,
//         //     blockNumber: i++
//         //   },
//         //   {
//         //     upsert: true,
//         //     includeResultMetadata: true,
//         //     // session: session
//         //   }
//         // ).session(session);
//         // if (transferDocuments.lastErrorObject?.updatedExisting) {
//         //   throw new Error("tried to create the same document");
//         // }
//         // console.log("data", transferDocuments)
//       // })
//     } catch (error) {
//       console.log(error)
//     }
//     // await session.endSession();
//   }
//   // await Promise.all([
//   //   op(), op(), op(),
//   //   op(), op(), op(),
//   //   op(), op(), op(),
//   //   op(), op(), op(),
//   //   op(), op(), op()
//   // ])
//   await op()
//   // await op()
//   // await op()
//   // await op()
//   // await op()
//   // await op()
//   // await op()
//   // await Promise.all([op()])
//   let docs = await CrosschainTransferModel.find();
//   console.log(docs.map(doc => doc.toObject()));
//   await mongoServer.stop();
// })()
