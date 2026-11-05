/** @jest-environment node */
import { getSanctionsDevOverride } from "./sanctionsDev"

jest.mock("server-only", () => ({}))
const address = "0x00000001101455bD9d013B53A7a6bdC866D216c8"
describe("server-controlled local screening fixture", () => {
  const originalEnv = process.env
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      SANCTIONS_DEV_ADDRESS: address,
      SANCTIONS_DEV_STATUS: "blocked",
    }
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
  })
  afterEach(() => {
    process.env = originalEnv
  })
  it.each(["clear", "blocked", "unavailable"])(
    "provides only the local %s fixture",
    (status) => {
      process.env.SANCTIONS_DEV_STATUS = status
      expect(getSanctionsDevOverride()).toEqual({
        address: address.toLowerCase(),
        status,
      })
    },
  )
  it.each([
    { NODE_ENV: "production" },
    { VERCEL: "1" },
    { VERCEL_ENV: "preview" },
    { VERCEL_ENV: "production" },
    { SANCTIONS_DEV_ADDRESS: "invalid" },
    { SANCTIONS_DEV_STATUS: "invalid" },
  ])("does not serialize a fixture for %s", (environment) => {
    process.env = { ...process.env, ...environment } as NodeJS.ProcessEnv
    expect(getSanctionsDevOverride()).toBeUndefined()
  })
})
