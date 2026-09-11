/* eslint-disable no-await-in-loop, no-restricted-syntax, import/no-extraneous-dependencies */
import { getDeploymentAddress } from "@wildcatfi/wildcat-sdk"
import { parseAbi, type Hex } from "viem"

import { borrower, CHAIN_ID, subgraphMarket } from "../borrowerflows/helpers"
import * as chain from "../lib/chain"
import { FORK_RPC, syncSubgraph, type Address } from "../lib/env"

/**
 * Shared plumbing for the MAIN-variant protocol suites (`e2e/mainflows/*`).
 *
 * These suites audit the LIVE (V2/V2.1) protocol the `main` app talks to — the behaviors
 * `mono/kb/deployed-stack` documents as production semantics — rather than the app's presentation
 * of them. Everything here therefore talks to the market implementation the fork's
 * `HooksFactory` deploys (`WildcatMarket_initCodeStorage` at the pinned Sepolia deployment), which
 * is the production bytecode.
 *
 * Nothing here touches `pins.markets` (the protected lender fixtures): the suites deploy their own
 * markets, owned by anvil #3, and reuse them across runs.
 */

export const GAS = 5_000_000n

// ---------------------------------------------------------------------------------------------
// ABIs
// ---------------------------------------------------------------------------------------------

/**
 * `MarketState` as the deployed V2 markets return it (`v2-protocol/src/libraries/MarketState.sol`).
 * Field order is load-bearing — it is the ABI tuple layout, verified against a pinned fixture
 * market on the fork before this file was written.
 */
export const marketStateAbi = parseAbi([
  "function currentState() view returns ((bool isClosed,uint128 maxTotalSupply,uint128 accruedProtocolFees,uint128 normalizedUnclaimedWithdrawals,uint104 scaledTotalSupply,uint104 scaledPendingWithdrawals,uint32 pendingWithdrawalExpiry,bool isDelinquent,uint32 timeDelinquent,uint16 protocolFeeBips,uint16 annualInterestBips,uint16 reserveRatioBips,uint112 scaleFactor,uint32 lastInterestAccruedTimestamp))",
  "function previousState() view returns ((bool isClosed,uint128 maxTotalSupply,uint128 accruedProtocolFees,uint128 normalizedUnclaimedWithdrawals,uint104 scaledTotalSupply,uint104 scaledPendingWithdrawals,uint32 pendingWithdrawalExpiry,bool isDelinquent,uint32 timeDelinquent,uint16 protocolFeeBips,uint16 annualInterestBips,uint16 reserveRatioBips,uint112 scaleFactor,uint32 lastInterestAccruedTimestamp))",
])

/** Protocol surface the deployed-stack docs name, beyond what lib/abis.ts already carries. */
export const protocolAbi = parseAbi([
  // MarketState.liquidityRequired(), i.e. the collateral obligation
  "function coverageLiquidity() view returns (uint256)",
  "function borrowableAssets() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function totalDebts() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function scaledBalanceOf(address account) view returns (uint256)",
  "function delinquencyFeeBips() view returns (uint256)",
  "function delinquencyGracePeriod() view returns (uint256)",
  "function withdrawalBatchDuration() view returns (uint256)",
  "function sentinel() view returns (address)",
  "function getUnpaidBatchExpiries() view returns (uint32[])",
  // Withdrawals
  "function queueWithdrawal(uint256 amount) returns (uint32)",
  "function queueFullWithdrawal() returns (uint32)",
  "function executeWithdrawal(address lender, uint32 expiry) returns (uint256)",
  "function executeWithdrawals(address[] lenders, uint32[] expiries) returns (uint256[])",
  "function repayAndProcessUnpaidWithdrawalBatches(uint256 repayAmount, uint256 maxBatches)",
  // Borrower + public surface
  "function deposit(uint256 amount)",
  "function depositUpTo(uint256 amount) returns (uint256)",
  "function borrow(uint256 amount)",
  "function repay(uint256 amount)",
  "function closeMarket()",
  "function collectFees()",
  "function updateState()",
  "function setMaxTotalSupply(uint256 newMaxTotalSupply)",
  "function maxTotalSupply() view returns (uint256)",
  "function annualInterestBips() view returns (uint256)",
  "function reserveRatioBips() view returns (uint256)",
  "function isClosed() view returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function borrower() view returns (address)",
  "function asset() view returns (address)",
  // Sanctions
  "function nukeFromOrbit(address account)",
])

/**
 * `MarketConstraintHooks.getParameterConstraints()` — the bounds the hooks INSTANCE (not the
 * template) enforces on every market it deploys. Read from the chain rather than hardcoded so the
 * constraint test stays true if a future deployment tightens them.
 */
export const constraintsAbi = parseAbi([
  "function getParameterConstraints() view returns ((uint32 minimumDelinquencyGracePeriod,uint32 maximumDelinquencyGracePeriod,uint16 minimumReserveRatioBips,uint16 maximumReserveRatioBips,uint16 minimumDelinquencyFeeBips,uint16 maximumDelinquencyFeeBips,uint32 minimumWithdrawalBatchDuration,uint32 maximumWithdrawalBatchDuration,uint16 minimumAnnualInterestBips,uint16 maximumAnnualInterestBips))",
])

export type ParameterConstraints = {
  minimumDelinquencyGracePeriod: number
  maximumDelinquencyGracePeriod: number
  minimumReserveRatioBips: number
  maximumReserveRatioBips: number
  minimumDelinquencyFeeBips: number
  maximumDelinquencyFeeBips: number
  minimumWithdrawalBatchDuration: number
  maximumWithdrawalBatchDuration: number
  minimumAnnualInterestBips: number
  maximumAnnualInterestBips: number
}

export const parameterConstraints = (hooks: Address) =>
  chain.publicClient.readContract({
    address: hooks,
    abi: constraintsAbi,
    functionName: "getParameterConstraints",
  }) as unknown as Promise<ParameterConstraints>

/** `WildcatSanctionsSentinel` — borrower-scoped sanctions plus the escrow factory. */
export const sentinelAbi = parseAbi([
  "function isSanctioned(address borrower, address account) view returns (bool)",
  "function isFlaggedByChainalysis(address account) view returns (bool)",
  "function getEscrowAddress(address borrower, address account, address asset) view returns (address)",
  "function overrideSanction(address account)",
  "function removeSanctionOverride(address account)",
  "function sanctionOverrides(address borrower, address account) view returns (bool)",
])

/** `WildcatSanctionsEscrow` — the quarantine an executed sanctioned withdrawal lands in. */
export const escrowAbi = parseAbi([
  "function balance() view returns (uint256)",
  "function canReleaseEscrow() view returns (bool)",
  "function escrowedAsset() view returns (address, uint256)",
  "function releaseEscrow()",
  "function account() view returns (address)",
])

/**
 * Sepolia's `MockChainalysis` (`deployments/sepolia/deployments.json`).
 *
 * The three selectors in its deployed runtime are `sanction(address)`, `unsanction(address)` and
 * `isSanctioned(address)` — decoded from the bytecode on the fork, and NONE of them is
 * access-controlled, which is what makes the sanctions/escrow path testable at all here. On
 * mainnet the sentinel points at the real Chainalysis oracle and no test can flip it.
 */
export const chainalysisAbi = parseAbi([
  "function isSanctioned(address account) view returns (bool)",
  "function sanction(address account)",
  "function unsanction(address account)",
])

export const SENTINEL = getDeploymentAddress(
  CHAIN_ID,
  "WildcatSanctionsSentinel",
) as Address
export const MOCK_CHAINALYSIS = getDeploymentAddress(
  CHAIN_ID,
  "MockChainalysis",
) as Address
export const OPEN_ACCESS_ROLE_PROVIDER = getDeploymentAddress(
  CHAIN_ID,
  "OpenAccessRoleProvider",
) as Address

// ---------------------------------------------------------------------------------------------
// reads
// ---------------------------------------------------------------------------------------------

export type MarketStateView = {
  isClosed: boolean
  maxTotalSupply: bigint
  accruedProtocolFees: bigint
  normalizedUnclaimedWithdrawals: bigint
  scaledTotalSupply: bigint
  scaledPendingWithdrawals: bigint
  pendingWithdrawalExpiry: number
  isDelinquent: boolean
  timeDelinquent: number
  protocolFeeBips: number
  annualInterestBips: number
  reserveRatioBips: number
  scaleFactor: bigint
  lastInterestAccruedTimestamp: number
}

/** Simulated "what is true right now" state — `_calculateCurrentState()` (PROTOCOL_MECHANICS). */
export const currentState = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: marketStateAbi,
    functionName: "currentState",
  }) as unknown as Promise<MarketStateView>

/** Last WRITTEN state — what the subgraph indexes. Diverges from `currentState` between writes. */
export const previousState = (market: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: marketStateAbi,
    functionName: "previousState",
  }) as unknown as Promise<MarketStateView>

const readNumeric = (market: Address, functionName: string) =>
  chain.publicClient.readContract({
    address: market,
    abi: protocolAbi,
    functionName: functionName as never,
  }) as unknown as Promise<bigint>

export const coverageLiquidity = (market: Address) =>
  readNumeric(market, "coverageLiquidity")
export const borrowableAssets = (market: Address) =>
  readNumeric(market, "borrowableAssets")
export const totalAssets = (market: Address) =>
  readNumeric(market, "totalAssets")
export const totalDebts = (market: Address) => readNumeric(market, "totalDebts")
export const marketTotalSupply = (market: Address) =>
  readNumeric(market, "totalSupply")
export const delinquencyFeeBips = (market: Address) =>
  readNumeric(market, "delinquencyFeeBips")
export const delinquencyGracePeriod = (market: Address) =>
  readNumeric(market, "delinquencyGracePeriod")
export const withdrawalBatchDuration = (market: Address) =>
  readNumeric(market, "withdrawalBatchDuration")

export const scaledBalanceOf = (market: Address, account: Address) =>
  chain.publicClient.readContract({
    address: market,
    abi: protocolAbi,
    functionName: "scaledBalanceOf",
    args: [account],
  }) as Promise<bigint>

export const unpaidBatchExpiries = async (market: Address) =>
  [
    ...((await chain.publicClient.readContract({
      address: market,
      abi: protocolAbi,
      functionName: "getUnpaidBatchExpiries",
    })) as readonly number[]),
  ].map(Number)

// ---------------------------------------------------------------------------------------------
// writes
// ---------------------------------------------------------------------------------------------

const waitTx = async (hash: Hex, meta?: chain.TxMeta) => {
  const receipt = await chain.publicClient.waitForTransactionReceipt({ hash })
  chain.recordTx(receipt, meta)
  if (receipt.status !== "success")
    throw new Error(
      `transaction ${hash} reverted (block ${receipt.blockNumber})`,
    )
  return receipt
}

/**
 * Send one call from `from`, journalled with its name and args.
 *
 * Defaults to `protocolAbi`; pass `abi` for the sentinel (or any other contract) so the sanctions
 * cases go through the same impersonate → fixed-gas → receipt-checked path as everything else.
 */
export const send = async (
  from: Address,
  address: Address,
  functionName: string,
  args: readonly unknown[] = [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abi: any = protocolAbi,
) => {
  await chain.ensureImpersonated(from)
  return waitTx(
    await chain.walletFor(from).writeContract({
      address,
      abi,
      functionName: functionName as never,
      args: args as never,
      gas: GAS,
    }),
    { functionName, args },
  )
}

/**
 * Simulate any `protocolAbi` call and report whether it reverts, without mining.
 *
 * The revert-expecting cases in these suites are protocol invariants (a fixed-term market refusing
 * a withdrawal, a deposit under the minimum, a sanctioned account's escrow refusing release), so
 * the assertion is on the revert itself — the exact custom-error name is recorded, not asserted,
 * because the deployed markets use the assembly error emitters and viem cannot always name them.
 */
export const simulate = async (params: {
  account: Address
  address: Address
  functionName: string
  args?: readonly unknown[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abi?: any
}): Promise<{ reverted: boolean; message?: string; result?: unknown }> => {
  try {
    const { result } = await chain.publicClient.simulateContract({
      account: params.account,
      address: params.address,
      abi: params.abi ?? protocolAbi,
      functionName: params.functionName as never,
      args: (params.args ?? []) as never,
    })
    return { reverted: false, result }
  } catch (error) {
    return {
      reverted: true,
      message: (error instanceof Error ? error.message : String(error))
        .split("\n")
        .slice(0, 3)
        .join(" | "),
    }
  }
}

/**
 * Queue a withdrawal and return the expiry the transaction actually WROTE.
 *
 * `chain.queueWithdrawal` returns the SIMULATED expiry — computed against the block before the tx
 * mines — so it is short by however long the tx took to land: 0-1 s on an idle fork, measured at
 * 4 s under a full board, and equal to the whole batch duration on a closed market (duration 0).
 * Every batch lookup is keyed by expiry, so the simulated value silently addresses an empty batch.
 * `previousState()` is exactly what the queueing transaction stored.
 */
export const queueWithdrawalAt = async (
  from: Address,
  market: Address,
  amount: bigint,
) => {
  await chain.queueWithdrawal(from, market, amount)
  return (await previousState(market)).pendingWithdrawalExpiry
}

// ---------------------------------------------------------------------------------------------
// sanctions (fork-only: Sepolia's sanctions oracle is a permissionless mock)
// ---------------------------------------------------------------------------------------------

export const isFlaggedByChainalysis = (account: Address) =>
  chain.publicClient.readContract({
    address: MOCK_CHAINALYSIS,
    abi: chainalysisAbi,
    functionName: "isSanctioned",
    args: [account],
  }) as Promise<boolean>

export const setChainalysisSanction = async (
  from: Address,
  account: Address,
  sanctioned: boolean,
) => {
  await chain.ensureImpersonated(from)
  return waitTx(
    await chain.walletFor(from).writeContract({
      address: MOCK_CHAINALYSIS,
      abi: chainalysisAbi,
      functionName: sanctioned ? "sanction" : "unsanction",
      args: [account],
      gas: 200_000n,
    }),
    { functionName: sanctioned ? "sanction" : "unsanction", args: [account] },
  )
}

export const sentinelIsSanctioned = (
  marketBorrower: Address,
  account: Address,
) =>
  chain.publicClient.readContract({
    address: SENTINEL,
    abi: sentinelAbi,
    functionName: "isSanctioned",
    args: [marketBorrower, account],
  }) as Promise<boolean>

export const escrowAddressFor = (
  marketBorrower: Address,
  account: Address,
  asset: Address,
) =>
  chain.publicClient.readContract({
    address: SENTINEL,
    abi: sentinelAbi,
    functionName: "getEscrowAddress",
    args: [marketBorrower, account, asset],
  }) as Promise<Address>

export const escrowBalance = (escrow: Address) =>
  chain.publicClient.readContract({
    address: escrow,
    abi: escrowAbi,
    functionName: "balance",
  }) as Promise<bigint>

export const escrowCanRelease = (escrow: Address) =>
  chain.publicClient.readContract({
    address: escrow,
    abi: escrowAbi,
    functionName: "canReleaseEscrow",
  }) as Promise<boolean>

export const releaseEscrow = async (from: Address, escrow: Address) => {
  await chain.ensureImpersonated(from)
  return waitTx(
    await chain.walletFor(from).writeContract({
      address: escrow,
      abi: escrowAbi,
      functionName: "releaseEscrow",
      gas: 400_000n,
    }),
    { functionName: "releaseEscrow" },
  )
}

// ---------------------------------------------------------------------------------------------
// market provisioning (the same SDK call path the create-market wizard makes)
// ---------------------------------------------------------------------------------------------

export type FixtureMarketSpec = {
  /** Distinctive name prefix — also the reuse key across runs. */
  namePrefix: string
  symbolPrefix: string
  assetAddress: string
  template?: "OpenTermHooks" | "FixedTermHooks"
  annualInterestBips?: number
  delinquencyFeeBips?: number
  reserveRatioBips?: number
  delinquencyGracePeriod?: number
  withdrawalBatchDuration?: number
  maxTotalSupplyUnits?: string
  minimumDepositUnits?: string
  /** FixedTermHooks only. Seconds since epoch. */
  fixedTermEndTime?: number
  allowClosureBeforeTerm?: boolean
  allowTermReduction?: boolean
  requireDepositAccess?: boolean
  /** Attach the OpenAccessRoleProvider so any address self-onboards. Default true. */
  openAccess?: boolean
}

export type DeployedFixture = {
  market: Address
  hooks: string
  txHash: string
  reused: boolean
}

/** Everything the SDK deploy path needs, resolved once per run. */
type DeployContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sdkRoot: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sdkAccess: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ethers: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constants: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  factory: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: any[]
}

let context: DeployContext | undefined

export const deployContext = async (): Promise<DeployContext> => {
  if (context) return context
  /* eslint-disable global-require, @typescript-eslint/no-var-requires */
  const { ethers, constants } = require("ethers")
  const sdkRoot = require("@wildcatfi/wildcat-sdk")
  const sdkAccess = require("@wildcatfi/wildcat-sdk/dist/access")
  /* eslint-enable global-require, @typescript-eslint/no-var-requires */

  const provider = new ethers.providers.JsonRpcProvider(FORK_RPC)
  const signer = provider.getSigner(borrower)
  const lens = sdkRoot.getLensV2Contract(CHAIN_ID, signer)
  const lensData = await lens.getHooksDataForBorrower(borrower)
  if (!lensData.isRegisteredBorrower)
    throw new Error(`${borrower} is not a registered borrower on the fork`)
  const templates = lensData.hooksTemplates.map((t: unknown) =>
    sdkAccess.hooksTemplateFromLens(
      CHAIN_ID,
      signer,
      t,
      borrower,
      lensData.isRegisteredBorrower,
    ),
  )
  context = {
    sdkRoot,
    sdkAccess,
    ethers,
    constants,
    factory: sdkRoot.getHooksFactoryContract(CHAIN_ID, signer),
    templates,
  }
  return context
}

/** Names of the hook templates the ArchController has registered on this deployment. */
export const registeredTemplateNames = async () =>
  (await deployContext()).templates.map((t: { name: string }) => t.name)

/** Build the parameter object `useDeployV2Market` hands to `previewDeployMarket`. */
const deployParams = async (spec: FixtureMarketSpec) => {
  const { sdkRoot, ethers, constants } = await deployContext()
  const provider = new ethers.providers.JsonRpcProvider(FORK_RPC)
  const asset = await sdkRoot.Token.getTokenData(
    CHAIN_ID,
    spec.assetAddress,
    provider.getSigner(borrower),
  )
  return {
    asset,
    params: {
      namePrefix: spec.namePrefix,
      symbolPrefix: spec.symbolPrefix,
      asset,
      maxTotalSupply: new sdkRoot.TokenAmount(
        ethers.utils.parseUnits(
          spec.maxTotalSupplyUnits ?? "1000000",
          asset.decimals,
        ),
        asset,
      ),
      minimumDeposit: asset.parseAmount(spec.minimumDepositUnits ?? "0"),
      annualInterestBips: spec.annualInterestBips ?? 1000,
      delinquencyFeeBips: spec.delinquencyFeeBips ?? 1000,
      reserveRatioBips: spec.reserveRatioBips ?? 2000,
      delinquencyGracePeriod: spec.delinquencyGracePeriod ?? 300,
      withdrawalBatchDuration: spec.withdrawalBatchDuration ?? 300,
      depositAccess: spec.requireDepositAccess
        ? sdkRoot.DepositAccess.RequiresCredential
        : sdkRoot.DepositAccess.Open,
      withdrawalAccess: sdkRoot.WithdrawalAccess.Open,
      transferAccess: sdkRoot.TransferAccess.Open,
      hooksInstanceName: `${spec.namePrefix.trim()} Policy`,
      salt: ethers.utils.hexZeroPad(
        ethers.utils.hexlify(Math.floor(Math.random() * 1e9)),
        32,
      ),
      hooksAddress: undefined,
      existingProviders:
        spec.openAccess === false
          ? []
          : [
              {
                providerAddress: OPEN_ACCESS_ROLE_PROVIDER,
                timeToLive: 90 * 86_400,
              },
            ],
      newProviderInputs: [],
      roleProviderFactory: constants.AddressZero,
      allowClosureBeforeTerm: spec.allowClosureBeforeTerm ?? true,
      allowForceBuyBacks: false,
      allowTermReduction: spec.allowTermReduction ?? true,
      fixedTermEndTime: spec.fixedTermEndTime ?? 0,
    },
  }
}

/**
 * Deploy one market through `HooksFactory.deployMarketAndHooks`, using the SDK template preview the
 * create-market wizard uses (`hooksTemplate.previewDeployMarket` → `factory[preview.fn](...)`).
 *
 * MINED, not `callStatic`: the M5 probe deliberately simulates, so nothing it "deploys" exists.
 * These suites need real markets — both as their own fixtures and as the proof that a v2-era
 * deploy lands, registers and indexes on this stack.
 */
export const deployMarket = async (
  spec: FixtureMarketSpec,
): Promise<DeployedFixture> => {
  const { sdkAccess, factory, templates } = await deployContext()
  const wanted = spec.template ?? "OpenTermHooks"
  const template = templates.find((t: { name: string }) => t.name === wanted)
  if (!template) throw new Error(`no ${wanted} template on the fork`)
  const { params } = await deployParams(spec)

  const preview = template.previewDeployMarket(params) as {
    status: string
    fn: string
    args: unknown[]
  }
  if (preview.status !== sdkAccess.DeployMarketStatus.Ready)
    throw new Error(`deploy preview not ready: ${preview.status}`)
  const tx = await factory[preview.fn](...preview.args)
  const receipt = await tx.wait()
  if (receipt.status !== 1)
    throw new Error(`market deploy reverted (${receipt.transactionHash})`)

  // Resolve the market from the factory's own MarketDeployed event rather than diffing the
  // subgraph: the deploy is the tx we just mined, and its log is authoritative and immediate.
  const topic = factory.interface.getEventTopic("MarketDeployed")
  const log = receipt.logs.find(
    (l: { topics: string[] }) => l.topics[0] === topic,
  )
  if (!log) throw new Error("deploy receipt carries no MarketDeployed event")
  const decoded = factory.interface.decodeEventLog(
    "MarketDeployed",
    log.data,
    log.topics,
  )
  const market = String(decoded.market).toLowerCase() as Address
  await syncSubgraph()
  const row = await subgraphMarket(market)
  return {
    market,
    hooks: row?.hooks?.id ?? "",
    txHash: receipt.transactionHash,
    reused: false,
  }
}

/**
 * Run a deploy exactly as far as the chain will take it, WITHOUT mining — the shape the constraint
 * cases need, where the expected outcome is a refusal.
 *
 * Two refusal surfaces exist and both count as "not deployable": the SDK template can decline to
 * produce a Ready preview, and `HooksFactory` can revert the `callStatic`.
 */
export const previewDeploy = async (
  spec: FixtureMarketSpec,
): Promise<{ outcome: "ready" | "not-ready" | "reverted"; detail: string }> => {
  const { sdkAccess, factory, templates } = await deployContext()
  const wanted = spec.template ?? "OpenTermHooks"
  const template = templates.find((t: { name: string }) => t.name === wanted)
  if (!template) throw new Error(`no ${wanted} template on the fork`)
  const { params } = await deployParams(spec)
  let preview: { status: string; fn: string; args: unknown[] }
  try {
    preview = template.previewDeployMarket(params) as typeof preview
  } catch (error) {
    return {
      outcome: "reverted",
      detail: (error as Error).message.split("\n")[0],
    }
  }
  if (preview.status !== sdkAccess.DeployMarketStatus.Ready)
    return { outcome: "not-ready", detail: String(preview.status) }
  try {
    await factory.callStatic[preview.fn](...preview.args)
    return { outcome: "ready", detail: "callStatic succeeded" }
  } catch (error) {
    return {
      outcome: "reverted",
      detail: (error as Error).message.split("\n")[0],
    }
  }
}
