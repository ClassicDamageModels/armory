import path from 'path'
import winston from 'winston'

const logDir = process.env.LOG_DIR || 'logs'
const logTag = process.env.LOG_TAG || 'armory'
const logLevel = 'debug'

const consoleTransport = new winston.transports.Console({ level: logLevel })

const fileTransport = new winston.transports.File({
  json: false,
  level: logLevel,
  filename: path.join(logDir, 'application.log'),
  formatter: logstashJsonFormatter
})

export default winston.createLogger({
  level: 'debug',
  transports: [consoleTransport, fileTransport]
})

function logstashJsonFormatter(options) {
  return JSON.stringify({
    ...options.meta,
    '@timestamp': new Date().toISOString(),
    message: options.message,
    level: options.level,
    tags: [logTag]
  })
}
