import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'
// import cors from '@koa/cors'
import { Server } from 'http'
import env from './env'
import manageTonWalletV4 from './send-ton'
import { watchBridge } from './watch-bridge'

(async function () {
  let sendMultipleTransfers = await manageTonWalletV4();
  watchBridge(sendMultipleTransfers);
})

const app = new Koa()

export default async function () {
  const router = new Router()
  app.use(bodyParser())
  app.use(router.routes())
  app.use(router.allowedMethods())
  return new Promise<Server>((resolve, reject) => {
    const connection = app
      .listen(env.PORT)
      .on('listening', () => {
        console.log(`HTTP is listening on ${env.PORT}`)
        resolve(connection)
      })
      .on('error', reject)
  })
}