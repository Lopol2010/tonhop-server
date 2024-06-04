import Koa from 'koa'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
// import cors from '@koa/cors'
import { Server } from 'http'
import { resolve } from 'path'
import env from './env'
import evmListener from './evm-listener'

evmListener( )

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