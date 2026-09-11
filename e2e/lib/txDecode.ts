/* eslint-disable no-restricted-syntax, import/no-extraneous-dependencies, no-nested-ternary, no-continue */
import {
  decodeFunctionData,
  formatUnits,
  maxUint256,
  type Abi,
  type AbiFunction,
  type Hex,
} from "viem"

import { DECODE_ABIS } from "./abis"
import { ANVIL_ACCOUNTS, FORK_GQL, pins } from "./env"

/**
 * Report-time transaction enrichment: turn journal tx entries (hash/from/to + either the
 * recorded functionName/args or raw calldata) into human sentences — contract NAMES (market
 * names from the fork subgraph), decoded function + labeled params, token amounts in human
 * units. Pure `enrichTransactions` is unit-testable offline; only `buildAddressBook` touches
 * the network, and it degrades to a pins-only book when the fork/subgraph is unreachable.
 */

export type BookEntry = {
  name: string
  kind: "market" | "token" | "policy" | "account" | "contract"
  /** Decimals for token amounts sent to this address (market/wrapper → its asset's). */
  decimals?: number
  symbol?: string
}

/** lowercased address → entry */
export type Book = Record<string, BookEntry>

/** Anvil account roles — see e2e/CONVENTIONS.md and lib/env.ts. */
const ACCOUNT_ROLES = [
  "account #0 (lender)",
  "account #1 (lender / co-lender)",
  "account #2 (lender)",
  "account #3 (borrower)",
  "account #4 (Borrower B — onboarding subject)",
  "account #5 (pristine wallet, BON-01)",
]

/** Fixed testnet deployments the harness talks to (see borrowerflows/helpers.ts). */
const KNOWN_CONTRACTS: Record<string, string> = {
  "0x981f1fb406bd7a8385f9373c08ab4c832ed0d508": "MockArchControllerOwner",
  "0xc003f20f2642c76b81e5e1620c6d8cdee826408f": "WildcatArchController",
}

type GqlBook = {
  markets: {
    id: string
    name: string
    asset: { address: string; symbol: string; decimals: number } | null
  }[]
  hooksInstances: { id: string; name: string }[]
  tokens: { id: string; name: string; symbol: string; decimals: number }[]
}

/** Build the address book: pins + anvil roles first (offline fallback), then ONE subgraph
 *  batch overlaying real market/policy/token names. Never throws. */
export const buildAddressBook = async (): Promise<Book> => {
  const book: Book = {}
  const put = (addr: string | undefined | null, entry: BookEntry) => {
    if (addr) book[addr.toLowerCase()] = entry
  }
  ANVIL_ACCOUNTS.forEach((a, i) =>
    put(a, { name: ACCOUNT_ROLES[i] ?? `account #${i}`, kind: "account" }),
  )
  Object.entries(KNOWN_CONTRACTS).forEach(([addr, name]) =>
    put(addr, { name, kind: "contract" }),
  )
  Object.entries(pins.markets).forEach(([key, addr]) => {
    if (key === "wrapper")
      put(addr, { name: "market-token wrapper (ERC-4626)", kind: "token" })
    else if (!book[addr.toLowerCase()])
      put(addr, { name: `pinned market "${key}"`, kind: "market" })
  })
  try {
    const res = await fetch(FORK_GQL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: `{
          markets(first: 1000) { id name asset { address symbol decimals } }
          hooksInstances(first: 1000) { id name }
          tokens(first: 1000) { id name symbol decimals }
        }`,
      }),
    })
    const { data } = (await res.json()) as { data?: GqlBook }
    if (!data) throw new Error("no data")
    // tokens first — markets ARE tokens, and the market entry (with its asset's units) wins.
    for (const t of data.tokens ?? [])
      put(t.id.replace(/^TKN-/, ""), {
        name:
          t.symbol && t.symbol !== t.name ? `${t.name} (${t.symbol})` : t.name,
        kind: "token",
        decimals: t.decimals,
        symbol: t.symbol,
      })
    for (const m of data.markets ?? [])
      put(m.id, {
        name: `market "${m.name}"`,
        kind: "market",
        decimals: m.asset?.decimals,
        symbol: m.asset?.symbol,
      })
    for (const h of data.hooksInstances ?? [])
      put(h.id, { name: `policy "${h.name}"`, kind: "policy" })
  } catch {
    /* fork subgraph unreachable — pins-only book; the report still renders */
  }
  return book
}

// ---------- pure enrichment ----------

/** Journal-shaped tx entry (a structural subset — the reporter's parsed JSON satisfies it). */
export type TxLikeEntry = {
  at?: string
  kind: string
  name?: string
  hash?: string
  status?: string
  block?: string
  gasUsed?: string
  from?: string
  to?: string
  functionName?: string
  args?: readonly unknown[]
  input?: string
  source?: string
  duringStep?: string
}

export type EnrichedTx = {
  hash?: string
  status?: string
  block?: string
  gasUsed?: string
  source?: string
  /** Step the tx belongs to — recorded (sweep) or inferred from journal order; "setup" if none. */
  during: string
  from?: string
  /** Sender label, e.g. `account #3 (borrower)`. */
  actor: string
  to?: string
  target: { name: string; kind?: string; address?: string }
  /** Decoded function name, or the 4-byte selector when unknown. */
  fn: string
  params: { name: string; value: string; raw: string }[]
  /** `fn(name: value, …)` */
  call: string
  /** Full readable one-liner for the timeline. */
  line: string
}

const short = (addr: string): string =>
  /^0x[0-9a-fA-F]{40}$/.test(addr)
    ? `${addr.slice(0, 6)}…${addr.slice(-4)}`
    : addr

const lookup = (book: Book, addr?: string | null): BookEntry | undefined =>
  addr ? book[addr.toLowerCase()] : undefined

const groupThousands = (int: string): string =>
  int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")

const fmtAmount = (v: bigint, decimals: number, symbol?: string): string => {
  if (v === maxUint256)
    return `unlimited (2^256−1)${symbol ? ` ${symbol}` : ""}`
  const [int, frac = ""] = formatUnits(v, decimals).split(".")
  const trimmed = frac.replace(/0+$/, "")
  const shownFrac =
    trimmed === ""
      ? ""
      : `.${trimmed.length > 6 ? `${trimmed.slice(0, 6)}…` : trimmed}`
  return `${groupThousands(int)}${shownFrac}${symbol ? ` ${symbol}` : ""}`
}

const AMOUNT_NAME = /amount|assets|shares|value|supply|cap|repay|sum/i
const TIME_NAME = /expiry|time|deadline/i
const BIPS_NAME = /bips/i

/** ABI input description for a decoded call (names + types drive param formatting). */
const abiInputsFor = (
  functionName: string,
  argCount: number,
): AbiFunction["inputs"] | undefined =>
  (DECODE_ABIS as readonly unknown[])
    .map((item) => item as AbiFunction)
    .find(
      (item) =>
        item.type === "function" &&
        item.name === functionName &&
        item.inputs.length === argCount,
    )?.inputs

const toBigInt = (v: unknown): bigint | undefined => {
  if (typeof v === "bigint") return v
  if (typeof v === "number" && Number.isInteger(v)) return BigInt(v)
  if (typeof v === "string" && /^-?\d+$/.test(v)) return BigInt(v)
  return undefined
}

const fmtValue = (
  value: unknown,
  input: { name?: string; type?: string } | undefined,
  book: Book,
  target: BookEntry | undefined,
): string => {
  if (Array.isArray(value))
    return `[${value
      .map((v) =>
        fmtValue(
          v,
          input && { ...input, type: input.type?.replace(/\[\]$/, "") },
          book,
          target,
        ),
      )
      .join(", ")}]`
  if (typeof value === "boolean") return String(value)
  if (typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value)) {
    const known = lookup(book, value)
    return known ? `${known.name} (${short(value)})` : short(value)
  }
  const big = toBigInt(value)
  if (big !== undefined && input?.type?.startsWith("uint")) {
    const name = input.name ?? ""
    if (big === maxUint256) return "unlimited (2^256−1)"
    if (BIPS_NAME.test(name))
      return `${(Number(big) / 100).toFixed(2)}% (${big} bips)`
    if (TIME_NAME.test(name) && big > 1_600_000_000n && big < 4_100_000_000n)
      return `${new Date(Number(big) * 1000)
        .toISOString()
        .replace(".000Z", "Z")} (${big})`
    if (AMOUNT_NAME.test(name) && target?.decimals !== undefined)
      return fmtAmount(big, target.decimals, target.symbol)
    return big.toString()
  }
  return String(value ?? "")
}

const rawStr = (value: unknown): string =>
  typeof value === "bigint"
    ? value.toString()
    : Array.isArray(value)
      ? JSON.stringify(value.map(rawStr))
      : String(value ?? "")

/** Decode fn+args for one entry: prefer the recorded functionName/args, else raw calldata. */
const decodeEntry = (
  e: TxLikeEntry,
): { fn: string; args: readonly unknown[]; inputs?: AbiFunction["inputs"] } => {
  if (e.functionName)
    return {
      fn: e.functionName,
      args: e.args ?? [],
      inputs: abiInputsFor(e.functionName, e.args?.length ?? 0),
    }
  if (e.input && e.input.length >= 10) {
    try {
      const { functionName, args } = decodeFunctionData({
        abi: DECODE_ABIS as Abi,
        data: e.input as Hex,
      })
      return {
        fn: functionName,
        args: args ?? [],
        inputs: abiInputsFor(functionName, args?.length ?? 0),
      }
    } catch {
      return { fn: `selector ${e.input.slice(0, 10)}`, args: [] }
    }
  }
  if (e.input === "0x") return { fn: "ETH transfer", args: [] }
  return { fn: "(unknown call)", args: [] }
}

/**
 * Enrich every `kind === "tx"` entry of a journal, in order (one EnrichedTx per tx entry).
 * `entries` must be the FULL journal so lib txs inherit the step they appear under.
 */
export const enrichTransactions = (
  entries: readonly TxLikeEntry[],
  book: Book,
): EnrichedTx[] => {
  const out: EnrichedTx[] = []
  let currentStep: string | undefined
  for (const e of entries) {
    if (e.kind === "step") {
      currentStep = e.name
      continue
    }
    if (e.kind !== "tx") continue
    const { fn, args, inputs } = decodeEntry(e)
    const targetEntry = lookup(book, e.to)
    const actorEntry = lookup(book, e.from)
    const actor =
      actorEntry?.name ?? (e.from ? short(e.from) : "(unknown sender)")
    const target = {
      name: targetEntry?.name ?? (e.to ? short(e.to) : "(contract creation)"),
      kind: targetEntry?.kind,
      address: e.to,
    }
    const params = args.map((value, i) => ({
      name: inputs?.[i]?.name ?? `arg${i}`,
      value: fmtValue(value, inputs?.[i], book, targetEntry),
      raw: rawStr(value),
    }))
    const call = `${fn}(${params
      .map((p) => `${p.name}: ${p.value}`)
      .join(", ")})`
    const during = e.duringStep ?? currentStep ?? "setup"
    out.push({
      hash: e.hash,
      status: e.status,
      block: e.block,
      gasUsed: e.gasUsed,
      source: e.source,
      during,
      from: e.from,
      actor,
      to: e.to,
      target,
      fn,
      params,
      call,
      line: `${actor} → ${call} on ${target.name}${
        e.source === "ui" ? " [via app UI]" : ""
      } — ${e.status ?? "?"}`,
    })
  }
  return out
}
