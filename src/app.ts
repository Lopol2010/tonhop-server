import env from './utils/env'
import { networkConfig } from './networkConfig'
import runMongo from './utils/runMongo'
import { CrosschainTransfer, CrosschainTransferModel } from './models/CrosschainTransfer'
import { onShutdown } from 'node-graceful-shutdown'
import mongoose from 'mongoose'
import { BridgeService } from './BridgeService'


(async function () {
  console.log(`NODE_ENV = ${env.NODE_ENV}`);
  console.log(`Network Config:`, networkConfig);
  console.log(`\n`);

  await runMongo();
  await CrosschainTransferModel.init();

  let bridgeService = await BridgeService.create();
  await bridgeService.start();

})()

onShutdown(async () => {
  await mongoose.disconnect();
})

