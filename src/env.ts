import * as dotenv from 'dotenv'
import { bool, cleanEnv, num, str } from 'envalid'
import { cwd } from 'process'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env') })

// eslint-disable-next-line node/no-process-env
export default cleanEnv(process.env, {
  MONGO: str(),
  PORT: num({ default: 1337 }),
  PRODUCTION: bool(),
  MNEMONIC: str()
})