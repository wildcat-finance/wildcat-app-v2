/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies, global-require, @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
import { randomBytes } from "node:crypto"

import {
  createSubgraphClient,
  DepositAccess,
  DeployMarketStatus,
  encodeAccessListRoleProviderDeploymentInputs,
  getBorrowerHooksData,
  getDeploymentAddress,
  getHooksFactoryAddress,
  getHooksTemplateDeploymentStatus,
  getHooksTemplateRegistrations,
  getRevolvingHooksFactoryContract,
  getStandardHooksFactoryContract,
  hasDeploymentAddress,
  Token,
  TransferAccess,
  WithdrawalAccess,
  WrapperFactory,
  type SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { zeroAddress } from "viem"

import { DECLINE_MLA_ASSIGNMENT_MESSAGE } from "../../src/config/mla-rejection"
import { formatDate } from "../../src/lib/mlaFormatters"
import * as chain from "./chain"
import {
  APP_URL,
  FORK_GQL,
  FORK_RPC,
  gql,
  pins,
  syncChainTimeToWallClock,
  syncSubgraph,
  type Address,
} from "./env"
import {
  borrower,
  ensureBorrowerRegistered,
  seedBorrowerProfile,
} from "../borrowerflows/helpers"

/**
 * Fast fixture-provisioning for the v2.5 board.
 *
 * Replaces the ~20-minute create-market WIZARD replay (borrowerflows/market-creation.spec.ts run
 * as the "fixtures" Playwright project) with direct chain-side factory provisioning: it deploys the
 * SAME set of markets/policies that suite creates for borrower #3, by calling the hooks factory the
 * app's create-market flow calls (`hooksTemplate.previewDeployMarket(params)` →
 * `factory[preview.fn](...preview.args)`; see src/app/[locale]/borrower/create-market/
 * hooks/useDeployV2Market.ts). market-creation.spec.ts still runs — as board coverage — but no
 * longer gates every other suite behind a 20-minute wizard replay.
 *
 * The set below is the CONTRACT the downstream suites' shape-based discovery relies on
 * (borrowerMarkets() in e2e/borrowerflows/lib.ts, resolveFixedTermFixture() in
 * e2e/lenderflows/lib.ts). See e2e/FIXTURE-MANIFEST.md.
 *
 * Idempotent: a market whose deterministic name prefix is already indexed under borrower #3 is
 * skipped, so provisionFixtures() is safe to re-run against the same fork.
 */

const CHAIN_ID = 11155111 as SupportedChainId

// Financial defaults, mirroring market-creation.spec.ts financialDefaults (percent → bips, h → s).
const APR_BIPS = 1000 // 10%
const PENALTY_BIPS = 1000 // 10%
const RESERVE_BIPS = 2000 // 20%
const GRACE_SECONDS = 3600 // 1h
const CYCLE_SECONDS = 3600 // 1h
const CAPACITY_UNITS = "1000000"
const MIN_DEPOSIT_UNITS = "100"

type Term = "open" | "fixed" | "periodic"
type MarketKind = "standard" | "revolving"
type Access = "self-onboard" | "allowlist"

export type FixtureSpec = {
  /** Distinctive market-name prefix AND the idempotency / discovery key ("E2E MC…"). */
  namePrefix: string
  symbolPrefix: string
  /** Policy (hooks instance) name — carries the "E2E Pol …" pattern BOP-04 discovers on. */
  policyName: string
  term: Term
  marketKind: MarketKind
  access: Access
  /** Percent (e.g. 2 → 200 bips). Revolving only. */
  commitmentFeePercent?: number
  reserveBips?: number
  minimumDepositUnits?: string
  /** FIXED term: seconds from the chain head at which the term matures. */
  fixedTermDaysAhead?: number
  allowClosureBeforeTerm?: boolean
  allowTermReduction?: boolean
  /** PERIODIC term: schedule in seconds. */
  periodDuration?: number
  withdrawalWindowDuration?: number
  firstWindowSecondsAhead?: number
  /** Deploy the ERC-4626 wrapper after the market (MKT-16 shape; WRP-04 discovery). */
  deployWrapper?: boolean
}

/**
 * The fixture set — a 1:1 factory reproduction of what borrowerflows/market-creation.spec.ts
 * deploys for borrower #3 (MKT-01/02/04/04b/05/06/07/13/14/16/20). Every downstream suite
 * discovers by SHAPE, so reproducing these shapes (owned by #3, oldest-first) makes the discovery
 * land on the provisioned markets deterministically.
 */
export const FIXTURES: FixtureSpec[] = [
  // Self-onboard open-term. Policy name contains "E2E Pol A" (borrower-ops BOP-04 discovery).
  {
    namePrefix: "E2E MC1",
    symbolPrefix: "E2EA",
    policyName: "E2E Pol A",
    term: "open",
    marketKind: "standard",
    access: "self-onboard",
  },
  {
    namePrefix: "E2E MC2",
    symbolPrefix: "E2EB",
    policyName: "E2E Pol A2",
    term: "open",
    marketKind: "standard",
    access: "self-onboard",
  },
  // Two fixed-term markets, both permitting closure + reduction, DIFFERENT maturities: borrower-ops
  // picks the LATER as the reduction/lock fixture (BOP-15/18, LEN-35) and the EARLIER as the
  // early-close target (BOP-24).
  {
    namePrefix: "E2E MC4",
    symbolPrefix: "E2EC",
    policyName: "E2E Pol B",
    term: "fixed",
    marketKind: "standard",
    access: "self-onboard",
    fixedTermDaysAhead: 30,
    allowClosureBeforeTerm: true,
    allowTermReduction: true,
  },
  {
    namePrefix: "E2E MC4b",
    symbolPrefix: "E2EK",
    policyName: "E2E Pol B2",
    term: "fixed",
    marketKind: "standard",
    access: "self-onboard",
    fixedTermDaysAhead: 12,
    allowClosureBeforeTerm: true,
    allowTermReduction: true,
  },
  // Revolving, non-periodic (apr-rcf-operations RCF fixture): reserve 0%, 2% commitment fee.
  {
    namePrefix: "E2E MC5",
    symbolPrefix: "E2ED",
    policyName: "E2E Pol R",
    term: "open",
    marketKind: "revolving",
    access: "self-onboard",
    commitmentFeePercent: 2,
    reserveBips: 0,
  },
  // Periodic, non-revolving (apr-periodic fixture): window < period.
  {
    namePrefix: "E2E MC6",
    symbolPrefix: "E2EE",
    policyName: "E2E Pol P",
    term: "periodic",
    marketKind: "standard",
    access: "self-onboard",
    periodDuration: 30 * 60,
    withdrawalWindowDuration: 10 * 60,
    firstWindowSecondsAhead: 60 * 60,
  },
  // Revolving AND periodic (wrappers-deployment WRP-05 close target: isUnclaimedSpare).
  {
    namePrefix: "E2E MC7",
    symbolPrefix: "E2EF",
    policyName: "E2E Pol RP",
    term: "periodic",
    marketKind: "revolving",
    access: "self-onboard",
    commitmentFeePercent: 1.5,
    periodDuration: 60 * 60,
    withdrawalWindowDuration: 30 * 60,
    firstWindowSecondsAhead: 90 * 60,
  },
  // Two allowlist (manual-approval) open-term markets: candidates[0] → borrower-ops primary /
  // allowlist-closure LEN-16; candidates[1] → credential-expiry LEN-34.
  {
    namePrefix: "E2E MC13",
    symbolPrefix: "E2EG",
    policyName: "E2E Pol C",
    term: "open",
    marketKind: "standard",
    access: "allowlist",
  },
  {
    namePrefix: "E2E MC14",
    symbolPrefix: "E2EH",
    policyName: "E2E Pol D",
    term: "open",
    marketKind: "standard",
    access: "allowlist",
  },
  // Self-onboard open-term WITH an ERC-4626 wrapper deployed at creation (wrappers-deployment
  // WRP-04 "wrapper deployed at creation"; wallet-transitions wrapper fallback).
  {
    namePrefix: "E2E MC16",
    symbolPrefix: "E2EI",
    policyName: "E2E Pol E",
    term: "open",
    marketKind: "standard",
    access: "self-onboard",
    deployWrapper: true,
  },
  // Extra self-onboard open-term spare (borrower-ops close targets BOP-22/23 → allowlist LEN-20).
  {
    namePrefix: "E2E MC20",
    symbolPrefix: "E2EN",
    policyName: "E2E Pol A3",
    term: "open",
    marketKind: "standard",
    access: "self-onboard",
  },
]

export type ProvisionResult = {
  market: Address
  hooks: string
  namePrefix: string
  policyName: string
  reused: boolean
  wrapper?: Address
}

type DeployContext = {
  signer: any
  templates: any[]
  asset: any
  assetAddress: Address
}

let ctx: DeployContext | undefined

/** Resolve the signer, the borrower's deployable hook templates and the shared mock asset. */
const deployContext = async (): Promise<DeployContext> => {
  if (ctx) return ctx
  const ethers = require("ethers")
  const provider = new ethers.providers.JsonRpcProvider(FORK_RPC)
  // Anvil #3 is anvil-owned: getSigner drives it without impersonation (anvil signs).
  const signer = provider.getSigner(borrower)

  // Templates come from the same path the app uses (useGetBorrowerHooksData): the fork subgraph's
  // hook-template registrations + the lens. Borrower must be registered first (deploy authority).
  const subgraphClient = createSubgraphClient(CHAIN_ID, FORK_GQL)
  const registrations = await getHooksTemplateRegistrations(subgraphClient, {
    fetchPolicy: "network-only",
  })
  const data = await getBorrowerHooksData({
    chainId: CHAIN_ID,
    signerOrProvider: signer,
    hooksTemplateRegistrations: registrations,
    borrower,
  })
  if (!data.isRegisteredBorrower)
    throw new Error(`${borrower} is not a registered borrower on the fork`)

  // The mock underlying every wizard market uses (the openTerm pin's asset).
  const { market: pinnedRow } = await gql<{
    market: { asset: { address: string } } | null
  }>(
    `{ market(id: "${pins.markets.openTerm.toLowerCase()}") { asset { address } } }`,
  )
  if (!pinnedRow)
    throw new Error("pinned openTerm market not indexed on the fork subgraph")
  const assetAddress = pinnedRow.asset.address as Address
  const asset = await Token.getTokenData(CHAIN_ID, assetAddress, signer)

  ctx = { signer, templates: data.hooksTemplates as any[], asset, assetAddress }
  return ctx
}

/** Existing borrower-#3 market names, lowercased, for idempotency. */
const existingMarketNames = async (): Promise<string[]> => {
  const { markets } = await gql<{ markets: { name: string }[] }>(
    `{ markets(first: 200, where: { borrower: "${borrower.toLowerCase()}" }) { name } }`,
  )
  return markets.map((m) => m.name.toLowerCase())
}

const roleProviderInputs = (access: Access, salt: string) => {
  if (access === "self-onboard") {
    return {
      existingProviders: [
        {
          providerAddress: getDeploymentAddress(
            CHAIN_ID,
            "OpenAccessRoleProvider",
          ),
          timeToLive: 90 * 86_400,
        },
      ],
      newProviderInputs: [],
      roleProviderFactory: zeroAddress,
    }
  }
  // Borrower-operated allowlist: deploy a borrower-administered AccessListRoleProvider inside the
  // same deployMarketAndHooks tx (mirrors utils/createMarketDeploy.getCreateMarketRoleProviderInputs).
  if (!hasDeploymentAddress(CHAIN_ID, "AccessListRoleProviderFactory")) {
    return {
      existingProviders: [],
      newProviderInputs: [],
      roleProviderFactory: zeroAddress,
    }
  }
  return {
    existingProviders: [],
    newProviderInputs: [
      {
        data: encodeAccessListRoleProviderDeploymentInputs({
          administrator: borrower,
          initialMembers: [],
          salt,
        }),
        timeToLive: 0,
      },
    ],
    roleProviderFactory: getDeploymentAddress(
      CHAIN_ID,
      "AccessListRoleProviderFactory",
    ),
  }
}

/** Build the previewDeployMarket params for one spec (mirrors create-market/page.tsx realParams). */
const buildParams = async (spec: FixtureSpec, salt: string) => {
  const { asset } = await deployContext()
  const chainNow = await chain.blockTimestamp()
  const base: Record<string, unknown> = {
    namePrefix: `${spec.namePrefix} `,
    symbolPrefix: spec.symbolPrefix,
    asset,
    maxTotalSupply: asset.parseAmount(CAPACITY_UNITS),
    minimumDeposit: asset.parseAmount(
      spec.minimumDepositUnits ?? MIN_DEPOSIT_UNITS,
    ),
    annualInterestBips: APR_BIPS,
    delinquencyFeeBips: PENALTY_BIPS,
    reserveRatioBips: spec.reserveBips ?? RESERVE_BIPS,
    delinquencyGracePeriod: GRACE_SECONDS,
    withdrawalBatchDuration: CYCLE_SECONDS,
    depositAccess: DepositAccess.RequiresCredential,
    withdrawalAccess: WithdrawalAccess.Open,
    transferAccess: TransferAccess.Open,
    hooksInstanceName: spec.policyName,
    salt,
    hooksAddress: undefined,
    marketKind: spec.marketKind,
    ...roleProviderInputs(spec.access, salt),
  }
  if (spec.marketKind === "revolving") {
    base.commitmentFeeBips = Math.round((spec.commitmentFeePercent ?? 0) * 100)
  }
  if (spec.term === "fixed") {
    // Wizard parity: the app's maturity picker floors to UTC calendar days, so land the fixture on the UTC-midnight instant N days ahead rather than N*86400s from the current time-of-day.
    base.fixedTermEndTime =
      Math.floor(
        (chainNow + (spec.fixedTermDaysAhead ?? 30) * 86_400) / 86_400,
      ) * 86_400
    base.allowClosureBeforeTerm = !!spec.allowClosureBeforeTerm
    base.allowTermReduction = !!spec.allowTermReduction
  }
  if (spec.term === "periodic") {
    base.firstWithdrawalWindowStart =
      chainNow + (spec.firstWindowSecondsAhead ?? 3600)
    base.periodDuration = spec.periodDuration ?? 1800
    base.withdrawalWindowDuration = spec.withdrawalWindowDuration ?? 600
  }
  return base
}

const TERM_KIND: Record<Term, string> = {
  fixed: "FixedTerm",
  periodic: "PeriodicTerm",
  open: "OpenTerm",
}

/**
 * Pick the deployable template for this term AND market kind. Templates are registered PER FACTORY
 * (standard vs revolving), so kind alone is ambiguous — the SDK's previewDeployMarket rejects a
 * template whose `hooksFactory` is not the factory for `marketKind` with `WrongHooksFactory`. This
 * mirrors the app's getDeployableHooksTemplate (useNewMarketHooksData.ts): kind + the target
 * factory + a clean deployment status.
 */
const templateForTerm = (
  templates: any[],
  term: Term,
  marketKind: MarketKind,
) => {
  const kind = TERM_KIND[term]
  const targetFactory = getHooksFactoryAddress(
    CHAIN_ID,
    marketKind,
  ).toLowerCase()
  const template = templates.find(
    (t) =>
      t.kind === kind &&
      t.hooksFactory?.toLowerCase() === targetFactory &&
      getHooksTemplateDeploymentStatus(t, marketKind) === undefined,
  )
  if (!template)
    throw new Error(
      `no deployable ${kind} hooks template for the ${marketKind} factory on the fork`,
    )
  return template
}

const factoryForKind = (signer: any, marketKind: MarketKind): any =>
  marketKind === "revolving"
    ? getRevolvingHooksFactoryContract(CHAIN_ID, signer)
    : getStandardHooksFactoryContract(CHAIN_ID, signer)

/**
 * Record the MLA refusal for a freshly deployed market through the app's own decline API — the
 * same ceremony the create-market wizard's "Don't Use" + "Sign MLA Refusal" step performs
 * (chooseMla/signMlaRefusal in ../borrowerflows/helpers.ts), driven headlessly: sign
 * DECLINE_MLA_ASSIGNMENT_MESSAGE with the fixture borrower's anvil-held key (mirrors the
 * personal_sign ceremonies in ../admin/admin.spec.ts's loginThroughApi) and POST it. Without this,
 * the market carries NO MLA decision at all (neither a signed MLA nor a refusal), which the
 * borrower market page treats as an unrecoverable gate: it renders only the "Select MLA Settings"
 * banner and hides every other section (src/app/[locale]/borrower/market/[address]/page.tsx).
 *
 * Idempotent: a market that already carries a decision — GET already 200s (a signed MLA, or a
 * prior refusal reported as `{ noMLA: true }`) or the decline POST itself comes back 409 (a
 * decision was recorded between the GET and the POST) — is treated as already done, not a failure.
 */
export const recordMlaRefusal = async (
  market: Address,
  namePrefix: string,
): Promise<void> => {
  const existing = await fetch(
    `${APP_URL}/api/mla/${market}?chainId=${CHAIN_ID}`,
  )
  if (existing.status === 200) return // already decided: a refusal or a signed MLA
  if (existing.status !== 404)
    throw new Error(
      `${namePrefix}: GET /api/mla/${market} returned ${existing.status}: ${await existing.text()}`,
    )

  const timeSigned = Date.now()
  const message = DECLINE_MLA_ASSIGNMENT_MESSAGE.replace(
    "{{market}}",
    market,
  ).replace("{{timeSigned}}", formatDate(timeSigned)!)
  const signature = await chain.walletFor(borrower).signMessage({ message })

  const res = await fetch(
    `${APP_URL}/api/mla/${market}/decline?chainId=${CHAIN_ID}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chainId: CHAIN_ID, signature, timeSigned }),
    },
  )
  if (res.status === 409) return // a decision landed first — already done
  if (res.status !== 200)
    throw new Error(
      `${namePrefix}: POST /api/mla/${market}/decline returned ${res.status}: ${await res.text()}`,
    )
}

/** Deploy one fixture market (+ optional wrapper) via the hooks factory, then wait for indexing. */
const deployFixture = async (spec: FixtureSpec): Promise<ProvisionResult> => {
  const { signer, templates } = await deployContext()
  const template = templateForTerm(templates, spec.term, spec.marketKind)
  // Salt shape the v2.5 factories require: immediate factory caller (borrower) + 12-byte nonce
  // (mirrors create-market/page.tsx getNewMarketSalt).
  const salt = `${borrower}${randomBytes(12).toString("hex")}`
  const params = await buildParams(spec, salt)

  const preview = template.previewDeployMarket(params as never) as {
    status: string
    fn: string
    args: unknown[]
  }
  if (preview.status !== DeployMarketStatus.Ready)
    throw new Error(
      `${spec.namePrefix}: deploy preview not ready (${preview.status})`,
    )

  const factory = factoryForKind(signer, spec.marketKind)
  const predicted = (
    await factory.computeMarketAddress(salt)
  ).toLowerCase() as Address

  const tx = await factory[preview.fn](...(preview.args as any[]))
  const receipt = await tx.wait()
  if (receipt.status !== 1)
    throw new Error(
      `${spec.namePrefix}: market deploy reverted (${receipt.transactionHash})`,
    )

  const code = await chain.publicClient.getBytecode({ address: predicted })
  if (!code || code === "0x")
    throw new Error(
      `${spec.namePrefix}: no code at predicted market ${predicted}`,
    )

  // The wizard this provisioner replaces made an MLA decision a mandatory, deploy-gating step; a
  // market with no decision at all is not "MLA-free", it's a market the borrower page refuses to
  // render (see recordMlaRefusal above). Record the refusal now, once, right after deploy.
  await recordMlaRefusal(predicted, spec.namePrefix)

  let wrapper: Address | undefined
  if (spec.deployWrapper) {
    const existing = (await WrapperFactory.getWrapperForMarket(
      CHAIN_ID,
      signer,
      predicted,
    )) as string
    if (existing && existing !== zeroAddress) {
      wrapper = existing.toLowerCase() as Address
    } else {
      const { result } = await WrapperFactory.createWrapper(
        CHAIN_ID,
        signer,
        predicted,
      )
      wrapper = String(result).toLowerCase() as Address
    }
  }

  await syncSubgraph()
  const { market: row } = await gql<{
    market: { id: string; hooks: { id: string } | null } | null
  }>(`{ market(id: "${predicted}") { id hooks { id } } }`)
  return {
    market: predicted,
    hooks: row?.hooks?.id ?? "",
    namePrefix: spec.namePrefix,
    policyName: spec.policyName,
    reused: false,
    wrapper,
  }
}

/**
 * Provision the full v2.5 fixture set for borrower #3. Idempotent: already-present markets (matched
 * by name prefix on the fork subgraph) are skipped. Returns one entry per fixture (reused or fresh).
 */
export const provisionFixtures = async (): Promise<ProvisionResult[]> => {
  // Prerequisites (the wizard's setup does exactly this):
  //  - align chain time to the wall clock BEFORE deploying, so the fixed-term maturities below are
  //    computed off the same clock the wall-clock signing suites and the market-creation guard use;
  //  - a registered borrower + a profile row (the chain hooks-data reads and deploy authority).
  await syncChainTimeToWallClock()
  await ensureBorrowerRegistered()
  seedBorrowerProfile()
  await syncSubgraph()

  const results: ProvisionResult[] = []
  for (const spec of FIXTURES) {
    const names = await existingMarketNames()
    // The deployed market name is `${namePrefix} ${asset.name}` — matching on the space-terminated
    // prefix is robust to the pinned asset's actual on-chain name and disambiguates MC1 from MC13
    // (and MC4 from MC4b).
    const prefix = `${spec.namePrefix} `.toLowerCase()
    if (names.some((n) => n.startsWith(prefix))) {
      results.push({
        market: zeroAddress,
        hooks: "",
        namePrefix: spec.namePrefix,
        policyName: spec.policyName,
        reused: true,
      })
    } else {
      results.push(await deployFixture(spec))
    }
  }
  return results
}
