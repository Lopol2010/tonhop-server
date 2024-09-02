import { bool, cleanEnv, num, str } from 'envalid'
import { cwd } from 'process'
import { resolve } from 'path'
// require('@dotenvx/dotenvx').config()

// dotenv.config({ path: resolve(__dirname, './../.env') })

// eslint-disable-next-line node/no-process-env
export default cleanEnv(process.env, {
  MONGO: str({ default: "" }),
  PORT: num({ default: 1337 }),
  NODE_ENV: str({ default: "development" }),
  MODE: str({ default: "" }),
  MNEMONIC: str(),
  PUBLIC_KEY: str(),
  PRIVATE_KEY: str(),
  BNB_HOTWALLET_PRIVATE_KEY: str<`0x${string}`>(),
  TONCENTER_API_KEY: str()
})