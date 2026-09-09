/** @jest-environment node */

import { PrismaClient } from "@prisma/client"

import {
  ProviderThrottleError,
  waitForProviderSlotWithClient,
} from "./providerThrottle"

describe("export provider throttle", () => {
  it("leases a group of provider slots with one database query", async () => {
    let active = 0
    let maximumActive = 0
    const database = {
      $queryRaw: jest.fn(async () => {
        active += 1
        maximumActive = Math.max(maximumActive, active)
        await new Promise((resolve) => {
          setImmediate(resolve)
        })
        active -= 1
        return [{ scheduledAt: new Date() }]
      }),
    } as unknown as PrismaClient

    await Promise.all(
      Array.from({ length: 20 }, () =>
        waitForProviderSlotWithClient(database, "rpc.example", 0),
      ),
    )

    expect(maximumActive).toBe(1)
    expect(database.$queryRaw).toHaveBeenCalledTimes(1)
  })

  it("reports scheduler failures without poisoning later reservations", async () => {
    const database = {
      $queryRaw: jest
        .fn()
        .mockRejectedValueOnce(new Error("connection pool exhausted"))
        .mockResolvedValueOnce([{ scheduledAt: new Date() }]),
    } as unknown as PrismaClient

    await expect(
      waitForProviderSlotWithClient(database, "retry.example", 0, 1),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProviderThrottleError>>({
        name: "ProviderThrottleError",
        message: "Provider request scheduler failed: connection pool exhausted",
      }),
    )
    await expect(
      waitForProviderSlotWithClient(database, "retry.example", 0, 1),
    ).resolves.toBeUndefined()
  })
})
