import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

/** Harness environment: pinned values, RPC/GraphQL helpers, harness scripts. */
const HARNESS = path.resolve(__dirname, "../../harness/fork")

export const pins = JSON.parse(
  readFileSync(path.join(HARNESS, "pins.json"), "utf8"),
) as {
  forkBlock: number
  smoke: { market: string; account: number }
  /** Markets chosen at pin time for specific flows (all open-access, mock assets). */
  markets: {
    openTerm: string
    periodic: string
    mla: string
    noMla: string
    fixedTerm: string
    wrapperMarket: string
    wrapper: string
    transferOpen: string
    transferDisabled: string
    transferRestricted: string
  }
}

export const FORK_RPC = "http://127.0.0.1:18545"
export const FORK_GQL =
  "http://127.0.0.1:18100/subgraphs/name/wildcat-sepolia-fork"
export const APP_URL = "http://127.0.0.1:3000"

/** Anvil's default accounts (keys held by anvil). Mirrors ANVIL_DEFAULT_ACCOUNTS in src/lib/connectors. */
export const ANVIL_ACCOUNTS = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  // #3: registered on-chain as a borrower (MockArchControllerOwner); used by borrower flows.
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  // #4: "Borrower B" — the page-2 onboarding subject (invited → accepts → registered by that suite).
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  // #5: page-2 BON-01 pristine wallet — must NEVER receive invites, funds or registrations.
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  // #6: page-1 ADMIN identity (seeded into AdminAccount by the admin suite's setup).
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
  // #7/#8: the two borrowers the page-1 admin suite invites and registers ("Borrower A"/"B").
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
  // #9: unprivileged stranger — used for negative auth checks only (login writes nothing).
  "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
] as const
export type Address = `0x${string}`

/** Run a harness script (harness/fork/scripts/<name>) and return stdout. */
export const sh = (script: string, ...args: string[]) =>
  execFileSync(path.join(HARNESS, "scripts", script), args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  })

export const faucet = (to: string, amount: bigint, token?: string) =>
  token
    ? sh("faucet.sh", to, token, amount.toString())
    : sh("faucet.sh", to, amount.toString())

export const dbExec = (sql: string) => sh("db-exec.sh", sql)

export const rpc = async <T>(
  method: string,
  params: unknown[] = [],
): Promise<T> => {
  const r = await fetch(FORK_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  })
  const j = await r.json()
  if (j.error) throw new Error(`${method}: ${JSON.stringify(j.error)}`)
  return j.result as T
}

export const gql = async <T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> => {
  const r = await fetch(FORK_GQL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  })
  const j = await r.json()
  if (j.errors) throw new Error(JSON.stringify(j.errors))
  return j.data as T
}

export const anvilHead = async () =>
  parseInt(await rpc<string>("eth_blockNumber"), 16)

/** Mine one block so graph-node notices the new head. */
export const nudge = async () => {
  await rpc("anvil_mine", ["0x1"])
}

/** Advance chain time by `seconds` and mine a block (test-only time travel). */
export const advanceTime = async (seconds: number) => {
  await rpc("evm_increaseTime", [seconds])
  await rpc("anvil_mine", ["0x1"])
}

/** Fast-forward chain time to wall clock (never backwards). The app classifies time-dependent state
 *  (batch expiry, terms) with Date.now(), so a chain that resumed days behind confuses it. */
export const syncChainTimeToWallClock = async () => {
  const chainTs = Number(
    BigInt(
      (
        await rpc<{ timestamp: string }>("eth_getBlockByNumber", [
          "latest",
          false,
        ])
      ).timestamp,
    ),
  )
  const wallTs = Math.floor(Date.now() / 1000)
  if (wallTs > chainTs) await advanceTime(wallTs - chainTs)
}

export const waitForSubgraphBlock = async (
  block: number,
  timeoutMs = 90_000,
) => {
  const t0 = Date.now()
  for (;;) {
    const { _meta } = await gql<{ _meta: { block: { number: number } } }>(
      "{ _meta { block { number } } }",
    )
    if (_meta.block.number >= block) return _meta.block.number
    if (Date.now() - t0 > timeoutMs)
      throw new Error(`fork subgraph at ${_meta.block.number} < ${block}`)
    await new Promise((res) => setTimeout(res, 1000))
  }
}

/** Mine a block and wait until the fork subgraph has indexed the current head. */
export const syncSubgraph = async () => {
  await nudge()
  return waitForSubgraphBlock(await anvilHead())
}
