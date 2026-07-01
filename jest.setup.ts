import { TextDecoder, TextEncoder } from "util"

process.env.SECRET_KEY ||= "wildcat-jest-secret"

if (!globalThis.TextEncoder) {
  Object.defineProperty(globalThis, "TextEncoder", {
    value: TextEncoder,
  })
}

if (!globalThis.TextDecoder) {
  Object.defineProperty(globalThis, "TextDecoder", {
    value: TextDecoder,
  })
}
