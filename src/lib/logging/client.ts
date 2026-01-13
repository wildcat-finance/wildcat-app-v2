import pino from "pino"

const level =
  process.env.NEXT_PUBLIC_LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug")

export const logger = pino({
  level,
  browser: {
    asObject: true,
  },
})
