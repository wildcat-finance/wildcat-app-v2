/** @jest-environment node */

import {
  EtherscanLog,
  getEtherscanMarketLogs,
  normalizeEtherscanLog,
} from "./etherscan"

const address = `0x${"1".repeat(40)}`
const hash = `0x${"2".repeat(64)}`
const blockHash = `0x${"3".repeat(64)}`
const topic = `0x${"4".repeat(64)}`

const rawLog = {
  address,
  blockHash,
  topics: [topic],
  data: "0x",
  blockNumber: "0x15ffdd4",
  timeStamp: "0x6890bae7",
  gasPrice: "0x1",
  gasUsed: "0x2",
  logIndex: "0x",
  transactionHash: hash,
  transactionIndex: "0x",
} satisfies EtherscanLog

describe("Etherscan log normalization", () => {
  afterEach(() => jest.restoreAllMocks())

  it("canonicalizes Etherscan's bare zero quantities", () => {
    const log = normalizeEtherscanLog(rawLog)

    expect(log.blockNumber).toBe("0x15ffdd4")
    expect(log.logIndex).toBe("0x0")
    expect(log.transactionIndex).toBe("0x0")
  })

  it("rejects quantities that cannot identify a log", () => {
    expect(() =>
      normalizeEtherscanLog({
        ...rawLog,
        topics: [],
        blockNumber: "not-a-number",
      }),
    ).toThrow("Invalid Etherscan blockNumber")
  })

  it("rejects trailing characters instead of partially parsing them", () => {
    expect(() =>
      normalizeEtherscanLog({ ...rawLog, logIndex: "0x1junk" }),
    ).toThrow("Invalid Etherscan logIndex")
  })

  it("normalizes the documented raw HTTP response before returning logs", async () => {
    process.env.ETHERSCAN_API_KEY = "test-key"
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "1", message: "OK", result: [rawLog] }),
    } as Response)

    const [log] = await getEtherscanMarketLogs(1, address, 1, 2)
    expect(log.logIndex).toBe("0x0")
    expect(log.transactionIndex).toBe("0x0")
  })

  it("bisects an explicit Etherscan range rejection", async () => {
    process.env.ETHERSCAN_API_KEY = "test-key"
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "0",
          message: "NOTOK",
          result: "Query timeout: block range too wide",
        }),
      } as Response)
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: "0",
          message: "No records found",
          result: "No records found",
        }),
      } as Response)

    await expect(getEtherscanMarketLogs(1, address, 1, 2)).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
