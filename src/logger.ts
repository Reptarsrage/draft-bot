import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development'

const logger = pino({
    level: isDev ? 'debug' : 'info',
    base: undefined, // no pid, hostname
    transport: isDev
        ? {
              target: 'pino-pretty',
              options: {
                  colorize: true,
              },
          }
        : undefined,
})

export default logger
