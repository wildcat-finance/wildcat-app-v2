import { registerOTel } from "@vercel/otel"

export function register() {
  registerOTel("wildcat-app-v2")
}
