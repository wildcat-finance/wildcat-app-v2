/* eslint-disable no-restricted-syntax, no-nested-ternary */
/**
 * Market provenance (Task 2): the pure market index. Every market a run transacts with gets an
 * entry saying where it came from (forked at the fork block, created by a row of this run, or
 * unknown) and every transaction and chain-time change the run applied to it, in order. Derived
 * from the run's own journal and the subgraph's facts — never from the ledger or the spec text.
 */
import {
  buildMarketIndex,
  fetchMarketFacts,
  type MarketFacts,
} from "../e2e/lib/marketIndex"
import type { MarketType, UatJournalEntry, UatTest } from "../e2e/lib/uatModel"
import { anchorOf } from "../e2e/lib/uatReport"

const FORK = 1_000

const CREATED = `0x${"c".repeat(40)}`
const LATE = `0x${"d".repeat(40)}`
const FORKED = `0x${"f".repeat(40)}`
const UNKNOWN = `0x${"e".repeat(40)}`
const UNTOUCHED = `0x${"a".repeat(40)}`
const PINNED = "0x07878e16a64ed6daacebe8a6537902a048de8f2d"
const FACTORY = `0x${"9".repeat(40)}`
const TOKEN = `0x${"7".repeat(40)}`
const LENDER = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"

const PINS = {
  openTerm: PINNED,
  noMla: PINNED,
  transferOpen: PINNED,
  wrapper: `0x${"b".repeat(40)}`,
}

let clock = 0
const at = () => {
  clock += 1
  return new Date(Date.UTC(2026, 8, 26, 7, 0, clock)).toISOString()
}

const step = (name: string): UatJournalEntry => ({
  at: at(),
  kind: "step",
  name,
})

const tx = (p: Partial<UatJournalEntry> & { hash: string; block: string }) =>
  ({
    at: at(),
    kind: "tx",
    status: "success",
    gasUsed: "21000",
    from: LENDER,
    ...p,
  }) as UatJournalEntry

/** A partial EnrichedTx — the index reads only during/actor/target/params/call. */
const en = (p: Record<string, unknown>) =>
  ({
    line: "",
    fn: "",
    params: [],
    ...p,
  }) as unknown as UatJournalEntry["enriched"]

const chainTime = (seconds: number, block: string): UatJournalEntry => ({
  at: at(),
  kind: "chain-time",
  seconds,
  fromTs: 1_790_400_000,
  toTs: 1_790_400_000 + seconds + 1,
  block,
})

const row = (
  p: Partial<UatTest> & { title: string; suite: string },
): UatTest => ({
  uatId: /^[A-Z]{2,4}-\d+/.exec(p.title)?.[0] ?? null,
  page: null,
  file: "e2e/x.spec.ts",
  status: "passed",
  expectedStatus: "passed",
  outcome: "passed",
  annotations: [],
  durationMs: 1,
  journal: [],
  stepShots: [],
  agreements: [],
  ...p,
})

/** The type the subgraph gives an open-term standard market: only the keys every term carries. */
const openType = (): MarketType => ({
  term: "open-term",
  kind: "standard",
  asset: `DAI ${TOKEN}`,
  config: { depositRequiresAccess: false, transfersDisabled: false },
})

const FACTS: MarketFacts = {
  [CREATED]: {
    name: "Created Market",
    symbol: "cMKT",
    deployedBlock: 1_010,
    deployedTx: "0xdeploy",
    type: openType(),
  },
  [LATE]: {
    name: "Late Market",
    symbol: "lMKT",
    deployedBlock: 1_020,
    deployedTx: "0xnotinthisrun",
    type: openType(),
  },
  [FORKED]: {
    name: "Forked Market",
    symbol: "fMKT",
    deployedBlock: 900,
    deployedTx: "0xold",
    type: openType(),
  },
  [UNTOUCHED]: {
    name: "Nobody Touched Me",
    symbol: "nMKT",
    deployedBlock: 950,
    type: openType(),
  },
}

/** A provision row (no uatId), a creating row, a lender row, and a row that time-travels. */
const fixture = (): UatTest[] => {
  clock = 0
  const provision = row({
    title: "provision the lender",
    suite: "setup › fixtures",
    journal: [
      step("approve the forked market"),
      // Names FORKED only inside the calldata (approve(spender)).
      tx({
        hash: "0xp1",
        block: "1001",
        to: TOKEN,
        input: `0x095ea7b3000000000000000000000000${FORKED.slice(
          2,
        )}${"f".repeat(64)}`,
        source: "ui",
      }),
    ],
  })
  const creator = row({
    title: "MKT-01: new market created",
    suite: "market creation",
    journal: [
      step("deploy"),
      // Same block as the deploy, different hash: must NOT be taken for the creator.
      tx({
        hash: "0xsameblock",
        block: "1010",
        to: FACTORY,
        functionName: "registerSomething",
        args: [],
      }),
      tx({
        hash: "0xdeploy",
        block: "1010",
        to: FACTORY,
        input: "0xad78e45a",
        source: "ui",
        enriched: en({
          during: "deploy",
          actor: "account #3 (borrower)",
          target: { name: "factory" },
          fn: "deployMarketAndHooks",
          params: [],
          call: "deployMarketAndHooks(…)",
          line: "",
        }),
      }),
    ],
  })
  const lender = row({
    title: "LEN-18: queue a withdrawal",
    suite: "lender flows",
    journal: [
      step("deposit into the created market"),
      // Names CREATED only via enriched.params[].raw.
      tx({
        hash: "0xl1",
        block: "1011",
        to: TOKEN,
        functionName: "approve",
        enriched: en({
          during: "deposit into the created market",
          actor: "account #0 (lender)",
          target: { name: "DAI", kind: "token" },
          fn: "approve",
          params: [{ name: "spender", value: "market", raw: CREATED }],
          call: "approve(spender: market)",
          line: "",
        }),
      }),
      // Names FORKED only via args.
      tx({
        hash: "0xl2",
        block: "1012",
        to: TOKEN,
        functionName: "approve",
        args: [FORKED, 5n as unknown as string],
      }),
      // Mentions CREATED only in call text (full address even) — must NOT match.
      tx({
        hash: "0xl3",
        block: "1013",
        to: TOKEN,
        functionName: "noop",
        enriched: en({
          during: "deposit into the created market",
          actor: "account #0 (lender)",
          target: { name: "DAI", kind: "token" },
          fn: "noop",
          params: [],
          call: `noop(${CREATED}) ${CREATED.slice(0, 6)}…${CREATED.slice(-4)}`,
          line: "",
        }),
      }),
      // A reverted tx on the pinned market is still history.
      tx({
        hash: "0xl4",
        block: "1014",
        to: PINNED,
        functionName: "queueWithdrawal",
        args: ["40"],
        status: "reverted",
      }),
      // A market the book knew at run time, absent from facts and pins now.
      tx({
        hash: "0xl5",
        block: "1015",
        to: UNKNOWN,
        functionName: "updateState",
        enriched: en({
          during: "deposit into the created market",
          actor: "account #0 (lender)",
          target: { name: 'market "Gone"', kind: "market", address: UNKNOWN },
          fn: "updateState",
          params: [],
          call: "updateState()",
          line: "",
        }),
      }),
      // The late market is transacted with but its creator is not in this run.
      tx({
        hash: "0xl6",
        block: "1016",
        to: LATE,
        functionName: "updateState",
      }),
    ],
  })
  const traveller = row({
    title: "LEN-19: withdraw after expiry",
    suite: "lender flows",
    journal: [
      step("let the batch expire, then execute"),
      // Journal order: chain-time first, then a UI tx the sweep spliced in AFTER it although it
      // landed a block earlier.
      chainTime(3_600, "1021"),
      tx({
        hash: "0xui",
        block: "1020",
        to: CREATED,
        input: "0x8c7ef3ee",
        source: "ui",
      }),
      tx({
        hash: "0xafter",
        block: "1022",
        to: CREATED,
        functionName: "executeWithdrawal",
      }),
    ],
  })
  const bystander = row({
    title: "LEN-20: time travel with no market",
    suite: "lender flows",
    journal: [step("wait"), chainTime(60, "1030")],
  })
  return [provision, creator, lender, traveller, bystander]
}

const byAddr = (idx: ReturnType<typeof buildMarketIndex>, a: string) =>
  idx.find((m) => m.address === a.toLowerCase())

describe("buildMarketIndex", () => {
  it("finds the creator by the deploy tx HASH, never by a same-block tx, and makes it seq 1", () => {
    const tests = fixture()
    const idx = buildMarketIndex(tests, FACTS, FORK, "run", PINS)
    const m = byAddr(idx, CREATED)!
    expect(m.origin).toBe("created")
    expect(m.createdBy).toEqual({
      row: "MKT-01",
      anchor: anchorOf(tests[1]),
      block: "1010",
      txHash: "0xdeploy",
    })
    expect(m.txs[0]).toMatchObject({
      seq: 1,
      row: "MKT-01",
      hash: "0xdeploy",
      call: "deployMarketAndHooks(…)",
      from: "account #3 (borrower)",
      kind: "tx",
    })
    expect(m.txs.map((t) => t.hash)).not.toContain("0xsameblock")
    expect(m.type).toEqual(openType())
    expect("parameters" in m).toBe(false)
    expect(m.name).toBe("Created Market")
  })

  it("carries the subgraph's type on a market with facts, and no type on one without", () => {
    const idx = buildMarketIndex(fixture(), FACTS, FORK, "run", PINS)
    expect(byAddr(idx, FORKED)!.type).toEqual(openType())
    // Known only through the run's own address book / the pins: no facts, so no type.
    for (const a of [UNKNOWN, PINNED]) {
      const m = byAddr(idx, a)!
      expect(m).toBeDefined()
      expect("type" in m).toBe(false)
      expect("parameters" in m).toBe(false)
    }
  })

  it("links a provision row without a uatId to its row-… anchor", () => {
    const tests = fixture()
    const m = byAddr(buildMarketIndex(tests, FACTS, FORK, "run", PINS), FORKED)!
    expect(m.txs[0].row).toBe("provision the lender")
    expect(m.txs[0].anchor).toBe(anchorOf(tests[0]))
    expect(m.txs[0].anchor).toMatch(/^row-/)
  })

  it("names a market by to / params[].raw / args / input — never by the call text", () => {
    const idx = buildMarketIndex(fixture(), FACTS, FORK, "run", PINS)
    const created = byAddr(idx, CREATED)!
    const forked = byAddr(idx, FORKED)!
    expect(created.txs.map((t) => t.hash)).toEqual([
      "0xdeploy",
      "0xl1",
      "0xui",
      undefined,
      "0xafter",
    ])
    expect(created.txs.map((t) => t.hash)).not.toContain("0xl3")
    expect(forked.txs.map((t) => t.hash)).toEqual(["0xp1", "0xl2"])
    expect(forked.origin).toBe("forked")
    expect(forked.forkBlock).toBe(FORK)
    // No enriched call on the args-only tx: the call is rebuilt from functionName + args.
    expect(forked.txs[1].call).toBe(`approve(${FORKED}, 5)`)
    // The swept UI tx with raw calldata only falls back to its selector.
    expect(created.txs[2].call).toBe("selector 0x8c7ef3ee")
  })

  it("collapses three pin keys on one address into one forked card, even with no facts", () => {
    const idx = buildMarketIndex(fixture(), {}, FORK, "run", PINS)
    const pinned = idx.filter((m) => m.address === PINNED)
    expect(pinned).toHaveLength(1)
    expect(pinned[0].origin).toBe("forked")
    expect(pinned[0].forkBlock).toBe(FORK)
    expect(pinned[0].name).toContain("openTerm")
    // The wrapper pin is a token, not a market.
    expect(idx.find((m) => m.address === PINS.wrapper)).toBeUndefined()
  })

  it("keeps a created market whose creator is not in this run's journal: created, no createdBy", () => {
    const m = byAddr(
      buildMarketIndex(fixture(), FACTS, FORK, "run", PINS),
      LATE,
    )!
    expect(m.origin).toBe("created")
    expect(m.createdBy).toBeUndefined()
    expect(m.txs.map((t) => t.hash)).toEqual(["0xl6"])
  })

  it("includes reverted transactions", () => {
    const m = byAddr(
      buildMarketIndex(fixture(), FACTS, FORK, "run", PINS),
      PINNED,
    )!
    expect(m.txs).toHaveLength(1)
    expect(m.txs[0]).toMatchObject({ status: "reverted", hash: "0xl4", seq: 1 })
  })

  it("orders chain-time by block against a swept UI tx in the same step", () => {
    const m = byAddr(
      buildMarketIndex(fixture(), FACTS, FORK, "run", PINS),
      CREATED,
    )!
    expect(m.txs.map((t) => [t.seq, t.kind, t.block])).toEqual([
      [1, "tx", "1010"],
      [2, "tx", "1011"],
      [3, "tx", "1020"],
      [4, "chain-time", "1021"],
      [5, "tx", "1022"],
    ])
    expect(m.txs[3].call).toBe("chain time +3,600 s → 2026-09-26T06:20:01Z")
    expect(m.txs[3].row).toBe("LEN-19")
    // A chain-time change in a row that touched no market belongs to no card.
    for (const card of buildMarketIndex(fixture(), FACTS, FORK, "run", PINS))
      expect(card.txs.map((t) => t.block)).not.toContain("1030")
  })

  it("drops a chain-time change that happened before the market existed", () => {
    const tests = fixture()
    // MKT-01's row jumps chain time at block 1005, five blocks before its deploy tx (1010).
    tests[1].journal.splice(1, 0, chainTime(86_400, "1005"))
    const m = byAddr(
      buildMarketIndex(tests, FACTS, FORK, "run", PINS),
      CREATED,
    )!
    expect(m.txs[0].hash).toBe("0xdeploy")
    expect(m.txs.map((t) => t.block)).not.toContain("1005")
    expect(m.txs.map((t) => t.seq)).toEqual([1, 2, 3, 4, 5])
  })

  it("tolerates case and a missing 0x: checksummed to / raw / input, input without 0x", () => {
    const A = "0x07878e16a64ed6daacebe8a6537902a048de8f2d"
    const CHECKSUM = "0x07878E16A64ed6daacebe8a6537902A048de8F2d"
    const facts: MarketFacts = {
      [CHECKSUM]: { name: "Mixed", deployedBlock: 900 },
    }
    clock = 0
    const t = row({
      title: "LEN-30: case",
      suite: "lender flows",
      journal: [
        step("s"),
        tx({ hash: "0xto", block: "1001", to: CHECKSUM, functionName: "f" }),
        tx({
          hash: "0xraw",
          block: "1002",
          to: TOKEN,
          enriched: en({
            params: [{ name: "spender", value: "m", raw: CHECKSUM }],
          }),
        }),
        tx({
          hash: "0xinput",
          block: "1003",
          to: TOKEN,
          input: `0x095ea7b3${"0".repeat(24)}${CHECKSUM.slice(
            2,
          ).toUpperCase()}`,
        }),
        tx({
          hash: "0xbare",
          block: "1004",
          to: TOKEN,
          input: `095ea7b3${"0".repeat(24)}${A.slice(2)}`,
        }),
      ],
    })
    const [m] = buildMarketIndex([t], facts, FORK, "run")
    expect(m.address).toBe(A)
    expect(m.origin).toBe("forked")
    expect(m.txs.map((x) => x.hash)).toEqual([
      "0xto",
      "0xraw",
      "0xinput",
      "0xbare",
    ])
  })

  it("orders two created markets sharing a block by their creators' journal time, and forked by first `at`", () => {
    const [C1, C2, F1, F2] = ["1", "2", "3", "4"].map(
      (d) => `0x${d.repeat(40)}`,
    )
    const facts: MarketFacts = {
      // Insertion order is the REVERSE of the expected order, so a pass is not an accident.
      [F2]: { name: "F2", deployedBlock: 10 },
      [F1]: { name: "F1", deployedBlock: 20 },
      [C2]: {
        name: "C2",
        deployedBlock: 1_050,
        deployedTx: "0xc2",
      },
      [C1]: {
        name: "C1",
        deployedBlock: 1_050,
        deployedTx: "0xc1",
      },
    }
    clock = 0
    const t = row({
      title: "MKT-30: two in one block",
      suite: "market creation",
      journal: [
        step("deploy"),
        tx({
          hash: "0xc1",
          block: "1050",
          to: FACTORY,
          functionName: "deploy",
        }),
        tx({
          hash: "0xc2",
          block: "1050",
          to: FACTORY,
          functionName: "deploy",
        }),
        tx({
          hash: "0xf1",
          block: "1051",
          to: F1,
          functionName: "updateState",
        }),
        tx({
          hash: "0xf2",
          block: "1052",
          to: F2,
          functionName: "updateState",
        }),
      ],
    })
    expect(
      buildMarketIndex([t], facts, FORK, "run").map((m) => m.name),
    ).toEqual(["C1", "C2", "F1", "F2"])
  })

  it("finds a market known only to the run's address book (enriched.target.kind market)", () => {
    const BOOK = `0x${"8".repeat(40)}`
    clock = 0
    const t = row({
      title: "LEN-31: book-only",
      suite: "lender flows",
      journal: [
        step("s"),
        tx({
          hash: "0xbook",
          block: "1001",
          to: BOOK,
          enriched: en({
            target: {
              name: 'market "Book Only"',
              kind: "market",
              address: BOOK,
            },
            call: "updateState()",
          }),
        }),
        // A token the book labelled a token is NOT a market.
        tx({
          hash: "0xtoken",
          block: "1002",
          to: TOKEN,
          enriched: en({
            target: { name: "DAI", kind: "token", address: TOKEN },
          }),
        }),
      ],
    })
    const idx = buildMarketIndex([t], {}, FORK, "run")
    expect(idx.map((m) => [m.address, m.name, m.origin])).toEqual([
      [BOOK, 'market "Book Only"', "unknown"],
    ])
  })

  it("passes derivedAt through", () => {
    for (const d of ["run", "render"] as const)
      for (const m of buildMarketIndex(fixture(), FACTS, FORK, d, PINS))
        expect(m.derivedAt).toBe(d)
  })

  it("classifies a non-pin market absent from facts as unknown", () => {
    const m = byAddr(
      buildMarketIndex(fixture(), FACTS, FORK, "run", PINS),
      UNKNOWN,
    )!
    expect(m.origin).toBe("unknown")
    expect(m.forkBlock).toBeUndefined()
    expect(m.name).toBe('market "Gone"')
  })

  it("restricts to touched markets and orders created (by block), then forked, then unknown", () => {
    const idx = buildMarketIndex(fixture(), FACTS, FORK, "run", PINS)
    expect(idx.map((m) => m.address)).toEqual([
      CREATED,
      LATE,
      FORKED,
      PINNED,
      UNKNOWN,
    ])
    expect(byAddr(idx, UNTOUCHED)).toBeUndefined()
  })
})

describe("fetchMarketFacts", () => {
  const GQL = "http://subgraph.test/graphql"
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  const M = `0x${"c".repeat(40)}`
  const MATURITY = 1_790_640_000 // 2026-09-29T00:00:00Z
  const FIRST_WINDOW = 1_790_600_000 // 2026-09-28T12:53:20Z

  type Shape = {
    hooksKind?: string
    marketKind?: string
    commitmentFeeBips?: string
  }

  /**
   * A subgraph that answers each field group; `broken` groups answer with a GraphQL error. The
   * hooksConfig carries EVERY term's fields, non-zero, so a key that shows up for the wrong term
   * is the derivation's fault, not the fixture's.
   */
  const subgraph = (
    broken: string[] = [],
    shape: Shape = { hooksKind: "OpenTerm", marketKind: "STANDARD" },
  ) => {
    const queries: string[] = []
    const fetchMock = jest.fn(
      async (url: unknown, init?: { body?: string }) => {
        expect(url).toBe(GQL)
        const { query } = JSON.parse(init?.body ?? "{}") as { query: string }
        queries.push(query)
        const group = query.includes("deployedEvent")
          ? "identity"
          : query.includes("hooksConfig")
            ? "hooks"
            : query.includes("marketKind")
              ? "v25"
              : "other"
        if (broken.includes(group))
          return {
            ok: true,
            status: 200,
            json: async () => ({
              errors: [
                {
                  message:
                    group === "v25"
                      ? "Type `Market` has no field `marketKind`"
                      : `Type \`Market\` has no field \`${group}\``,
                },
              ],
            }),
          }
        const market: Record<string, unknown> = { id: M }
        if (group === "identity")
          Object.assign(market, {
            name: "Created Market",
            symbol: "cMKT",
            deployedEvent: { blockNumber: "1010", transactionHash: "0xdeploy" },
            asset: { address: TOKEN, symbol: "DAI" },
          })
        if (group === "hooks")
          Object.assign(market, {
            hooks: shape.hooksKind ? { kind: shape.hooksKind } : null,
            hooksConfig: {
              transfersDisabled: false,
              depositRequiresAccess: true,
              fixedTermEndTime: MATURITY,
              allowClosureBeforeTerm: true,
              allowTermReduction: false,
              firstWithdrawalWindowStart: FIRST_WINDOW,
              periodDuration: 1_800,
              withdrawalWindowDuration: 600,
            },
          })
        if (group === "v25")
          Object.assign(market, {
            marketKind: shape.marketKind,
            commitmentFeeBips: shape.commitmentFeeBips ?? "0",
          })
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { markets: [market] } }),
        }
      },
    )
    return { fetchMock, queries }
  }

  const ALL = { depositRequiresAccess: true, transfersDisabled: false }
  const FIXED = {
    maturity: "2026-09-29T00:00:00Z",
    allowClosureBeforeTerm: true,
    allowTermReduction: false,
  }
  const PERIODIC = {
    periodDuration: 1_800,
    withdrawalWindowDuration: 600,
    firstWithdrawalWindowStart: "2026-09-28T12:53:20Z",
  }

  it("merges the field groups into one fact per market: identity plus the market type", async () => {
    const { fetchMock, queries } = subgraph()
    globalThis.fetch = fetchMock as never
    const facts = await fetchMarketFacts(GQL)
    expect(queries).toHaveLength(3)
    expect(facts[M]).toEqual({
      name: "Created Market",
      symbol: "cMKT",
      deployedBlock: 1010,
      deployedTx: "0xdeploy",
      type: {
        term: "open-term",
        kind: "standard",
        asset: `DAI ${TOKEN}`,
        config: ALL,
      },
    })
    expect("parameters" in facts[M]).toBe(false)
  })

  it("asks only for what the type needs — no rates, supply or decimals", async () => {
    const { fetchMock, queries } = subgraph()
    globalThis.fetch = fetchMock as never
    await fetchMarketFacts(GQL)
    const all = queries.join(" ")
    for (const gone of [
      "annualInterestBips",
      "maxTotalSupply",
      "minimumDeposit",
      "decimals",
    ])
      expect(all).not.toContain(gone)
    expect(all).toContain("hooks { kind }")
  })

  it.each([
    ["OpenTerm", "STANDARD", "0", "open-term", "standard", ALL],
    [
      "OpenTerm",
      "REVOLVING",
      "200",
      "open-term",
      "revolving",
      { commitmentFeeBips: 200, ...ALL },
    ],
    [
      "FixedTerm",
      "STANDARD",
      "0",
      "fixed-term",
      "standard",
      { ...FIXED, ...ALL },
    ],
    [
      "FixedTerm",
      "REVOLVING",
      "150",
      "fixed-term",
      "revolving",
      { ...FIXED, commitmentFeeBips: 150, ...ALL },
    ],
    [
      "PeriodicTerm",
      "STANDARD",
      "0",
      "periodic-term",
      "standard",
      { ...PERIODIC, ...ALL },
    ],
    [
      "PeriodicTerm",
      "REVOLVING",
      "150",
      "periodic-term",
      "revolving",
      { ...PERIODIC, commitmentFeeBips: 150, ...ALL },
    ],
  ])(
    "hooks %s + marketKind %s (fee %s) → %s/%s with only that term's config",
    async (hooksKind, marketKind, fee, term, kind, config) => {
      const { fetchMock } = subgraph([], {
        hooksKind,
        marketKind,
        commitmentFeeBips: fee,
      })
      globalThis.fetch = fetchMock as never
      const facts = await fetchMarketFacts(GQL)
      expect(facts[M].type).toEqual({
        term,
        kind,
        asset: `DAI ${TOKEN}`,
        config,
      })
    },
  )

  it("main's subgraph (no marketKind): term and config still resolve, no kind, no fee", async () => {
    const { fetchMock } = subgraph(["v25"], { hooksKind: "FixedTerm" })
    globalThis.fetch = fetchMock as never
    const facts = await fetchMarketFacts(GQL)
    expect(facts[M].type).toEqual({
      term: "fixed-term",
      asset: `DAI ${TOKEN}`,
      config: { ...FIXED, ...ALL },
    })
    expect("kind" in facts[M].type!).toBe(false)
  })

  it("term is unknown when the hooks are missing — the hooks group refused, or no hooks on record", async () => {
    const refused = subgraph(["hooks"])
    globalThis.fetch = refused.fetchMock as never
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    const a = await fetchMarketFacts(GQL)
    warn.mockRestore()
    expect(a[M].deployedTx).toBe("0xdeploy")
    expect(a[M].type).toEqual({
      term: "unknown",
      kind: "standard",
      asset: `DAI ${TOKEN}`,
      config: {},
    })
    const none = subgraph([], { marketKind: "STANDARD" })
    globalThis.fetch = none.fetchMock as never
    const b = await fetchMarketFacts(GQL)
    expect(b[M].type!.term).toBe("unknown")
  })

  it("never throws on the network: an unreachable subgraph yields {}", async () => {
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED")
    }) as never
    await expect(fetchMarketFacts(GQL)).resolves.toEqual({})
  })

  describe("diagnostics", () => {
    let warn: jest.SpyInstance
    beforeEach(() => {
      warn = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    })
    afterEach(() => {
      warn.mockRestore()
      jest.useRealTimers()
    })

    const warnings = () => warn.mock.calls.map((c) => c.map(String).join(" "))

    it("warns with the group name and the first GraphQL error when a group is refused", async () => {
      const { fetchMock } = subgraph(["hooks"])
      globalThis.fetch = fetchMock as never
      await fetchMarketFacts(GQL)
      expect(
        warnings().some(
          (w) =>
            w.includes("hooks { kind }") &&
            w.includes("Type `Market` has no field `hooks`"),
        ),
      ).toBe(true)
    })

    it("stays silent when a pre-2.5 subgraph lacks the v2.5-only fields — that refusal is expected on main", async () => {
      const { fetchMock } = subgraph(["v25"])
      globalThis.fetch = fetchMock as never
      const facts = await fetchMarketFacts(GQL)
      expect(facts[M].type!.term).toBe("open-term")
      expect(warnings()).toEqual([])
    })

    it("still warns when the v2.5-only group fails for any other reason", async () => {
      globalThis.fetch = (async (_u: unknown, init?: { body?: string }) => {
        const { query } = JSON.parse(init?.body ?? "{}") as { query: string }
        if (query.includes("marketKind"))
          return {
            ok: true,
            status: 200,
            json: async () => ({ errors: [{ message: "indexer overloaded" }] }),
          }
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { markets: [] } }),
        }
      }) as never
      await fetchMarketFacts(GQL)
      expect(
        warnings().some(
          (w) =>
            w.includes("marketKind commitmentFeeBips") &&
            w.includes("indexer overloaded"),
        ),
      ).toBe(true)
    })

    it("warns and drops the group on an HTTP failure", async () => {
      globalThis.fetch = (async () => ({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError("Unexpected token <")
        },
      })) as never
      await expect(fetchMarketFacts(GQL)).resolves.toEqual({})
      expect(warnings().some((w) => w.includes("HTTP 502"))).toBe(true)
    })

    it("aborts a group that hangs past the timeout and yields what the others returned", async () => {
      jest.useFakeTimers()
      globalThis.fetch = ((_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(
              new DOMException("The operation was aborted.", "AbortError"),
            ),
          )
        })) as never
      const pending = fetchMarketFacts(GQL)
      await jest.advanceTimersByTimeAsync(10_000)
      await expect(pending).resolves.toEqual({})
      expect(warnings().some((w) => /abort/i.test(w))).toBe(true)
    })

    it("lets a programming error propagate instead of returning {}", async () => {
      const market = { id: M }
      Object.defineProperty(market, "name", {
        enumerable: true,
        get() {
          throw new TypeError("bug in the merge")
        },
      })
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: { markets: [market] } }),
      })) as never
      await expect(fetchMarketFacts(GQL)).rejects.toThrow(TypeError)
    })
  })
})
