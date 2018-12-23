import _ from 'lodash'

const defaults = {
  env: 'dev',
  logDir: 'logs',
  port: 4444,
  databaseUrl: 'postgres://armory@localhost:5432/armory',
  uploadDir: './upload'
}

const envConfig = _.omitBy(
  {
    env: process.env.APP_ENV,
    port: process.env.PORT,
    logDir: process.env.LOG_DIR,
    databaseUrl: process.env.DATABASE_URL,
    uploadDir: process.env.UPLOAD_DIR
  },
  x => x === undefined
)

export default { ...defaults, ...envConfig }
