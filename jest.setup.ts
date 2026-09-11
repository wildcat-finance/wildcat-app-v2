import { TextDecoder, TextEncoder } from "util"

// jsdom does not provide TextEncoder/TextDecoder, which viem's byte encoding needs as soon as a
// test requires the real module (src/lib/connectors/localAnvilConnector.test.ts does). Additive:
// nothing is replaced if the environment already supplies them.
if (!globalThis.TextEncoder) {
  Object.defineProperty(globalThis, "TextEncoder", { value: TextEncoder })
}

if (!globalThis.TextDecoder) {
  Object.defineProperty(globalThis, "TextDecoder", { value: TextDecoder })
}
