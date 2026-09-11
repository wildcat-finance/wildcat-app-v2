/* eslint-disable import/no-extraneous-dependencies */
import { parseAbi, type Abi } from "viem"

/**
 * Centralized contract ABIs — the single source for the flow helpers AND the report-time
 * transaction decoder (txDecode.ts). Input param NAMES matter here: the UAT report labels
 * decoded call arguments with them ("amount: 1,000 USDC"), so keep them descriptive.
 */

/** WildcatMarket v2.5 — lender surface (lib/chain.ts). */
export const marketAbi = parseAbi([
  "function asset() view returns (address)",
  "function balanceOf(address account) view returns (uint256)",
  "function withdrawalBatchDuration() view returns (uint256)",
  "function depositUpTo(uint256 amount) returns (uint256)",
  "function queueWithdrawal(uint256 amount) returns (uint32)",
  "function updateState()",
  "function executeWithdrawal(address lender, uint32 expiry) returns (uint256)",
  "function getWithdrawalBatch(uint32 expiry) view returns ((uint104 scaledTotalAmount, uint104 scaledAmountBurned, uint128 normalizedAmountPaid))",
  "function getAccountWithdrawalStatus(address lender, uint32 expiry) view returns ((uint104 scaledAmount, uint128 normalizedAmountWithdrawn))",
  "function getAvailableWithdrawalAmount(address lender, uint32 expiry) view returns (uint256)",
])

export const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
])

export const erc20TransferAbi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
])

/** WildcatMarket v2.5 — borrower surface (borrowerflows/lib.ts). */
export const borrowerMarketAbi = parseAbi([
  "function borrow(uint256 amount)",
  "function repay(uint256 amount)",
  "function closeMarket()",
  "function collectFees()",
  "function setMaxTotalSupply(uint256 newMaxTotalSupply)",
  "function setAnnualInterestAndReserveRatioBips(uint16 annualInterestBips, uint16 reserveRatioBips)",
  "function annualInterestBips() view returns (uint256)",
  "function reserveRatioBips() view returns (uint256)",
  "function maxTotalSupply() view returns (uint256)",
  "function borrowableAssets() view returns (uint256)",
  "function isClosed() view returns (bool)",
  "function scaleFactor() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
])

/**
 * WildcatMarketRevolving v2.5 — the two getters the RCF pricing oracle needs.
 * `commitmentFeeBips` is backed by an `internal immutable` set in the constructor from the
 * factory's transient deployment data and has NO setter (WildcatMarketRevolving.sol:17,:54):
 * the commitment component of a revolving market's pricing cannot change for this generation.
 */
export const revolvingMarketAbi = parseAbi([
  "function commitmentFeeBips() view returns (uint256)",
  "function drawnAmount() view returns (uint256)",
])

/** WildcatMarketConfig v2.5 — permissionless application of a matured periodic APR proposal. */
export const marketAprExecutionAbi = parseAbi([
  "function executePendingAnnualInterestBipsReduction()",
])

/**
 * PeriodicTermHooks v2.5 — withdrawal-window schedule and the APR reduction proposal lifecycle
 * (src/access/PeriodicTermHooks.sol). `getPendingAprChange` returns the proposal plus the
 * response-window bounds fixed at proposal time (:443).
 */
export const periodicHooksAbi = parseAbi([
  "struct PendingAprChange { uint16 annualInterestBips; uint32 proposalTimestamp; }",
  "struct HookedMarket { bool isHooked; bool transferRequiresAccess; bool depositRequiresAccess; bool withdrawalRequiresAccess; bool depositHookEnabled; uint96 minimumDeposit; uint32 firstWithdrawalWindowStart; uint32 periodDuration; uint32 withdrawalWindowDuration; bool transfersDisabled; bool isClosed; }",
  "function getPendingAprChange(address market) view returns (PendingAprChange pendingAprChange, uint32 responseWindowStart, uint32 responseWindowEnd)",
  "function getHookedMarket(address market) view returns (HookedMarket)",
  "function isWithdrawalWindowOpen(address market) view returns (bool)",
  "function proposeAnnualInterestBips(address market, uint16 annualInterestBips)",
  "function AprReductionProposalValidityPeriods() view returns (uint32)",
])

/**
 * Custom errors the periodic-APR lifecycle raises, so a simulated revert decodes to a NAME
 * instead of a bare selector ("Unable to decode signature 0xd05168e6…"). The negative branches
 * assert the SPECIFIC error, so this is load-bearing rather than cosmetic. Selectors verified
 * against keccak256 of each signature; the hook's errors bubble through a market call unchanged.
 * Sources: PeriodicTermHooks.sol:110-121, MarketConstraintHooks, WildcatMarketConfig.
 */
export const periodicAprErrorsAbi = parseAbi([
  "error AprReductionProposalDuringWithdrawalWindow()", // 0xd05168e6
  "error AprReductionProposalNotReduction()", // 0x8e87b47d
  "error NoPendingAprChange()", // 0x804e6c33
  "error AprChangeDoesNotMatchProposal()", // 0xce735f22
  "error AprChangeNotReady()", // 0x2f4172e9
  "error AprReductionProposalExpired()", // 0x2659e422
  "error AprReductionProposalOnClosedMarket()", // 0xad926632
  "error UnpaidWithdrawalsExist()", // 0xe75f6fdf
  "error NotHookedMarket()", // 0xb217907b
  "error WithdrawOutsideWindow()", // 0x34a398c7
  "error AnnualInterestBipsOutOfBounds()", // 0x74e6ce76
  // market-level guards that can pre-empt the hook
  "error InsufficientReservesForOldLiquidityRatio()", // 0x0a68e5bf
  "error AprChangeOnClosedMarket()", // 0xb9de88a2
  "error NotApprovedBorrower()", // 0x02171e6a
])

/** BaseAccessControls (hooks instance) + MarketConstraintHooks views. */
export const hooksExtrasAbi = parseAbi([
  "function getPreviousLenderStatus(address account) view returns ((bool isBlockedFromDeposits, address lastProvider, bool canRefresh, uint32 lastApprovalTimestamp))",
  "function getLenderStatus(address account) view returns ((bool isBlockedFromDeposits, address lastProvider, bool canRefresh, uint32 lastApprovalTimestamp))",
  "function unblockFromDeposits(address account)",
  "function temporaryExcessReserveRatio(address market) view returns (uint16 originalAnnualInterestBips, uint16 originalReserveRatioBips, uint32 expiry)",
])

/**
 * FixedTermHooks — the administrator-only maturity setter and the per-market record it writes.
 * `getHookedMarket` is the authority on the CURRENT maturity: the subgraph's
 * `hooksConfig.fixedTermEndTime` is an indexed copy that lags a `FixedTermUpdated` event, so a
 * maturity change is confirmed here first and only then cross-checked against the indexed row.
 * Struct order mirrors v2.5-protocol/src/access/FixedTermHooks.sol:13.
 */
export const fixedTermHooksAbi = parseAbi([
  "function getHookedMarket(address market) view returns ((bool isHooked, bool transferRequiresAccess, bool depositRequiresAccess, bool withdrawalRequiresAccess, uint128 minimumDeposit, uint32 fixedTermEndTime, bool transfersDisabled, bool allowClosureBeforeTerm, bool allowTermReduction))",
  "function setFixedTermEndTime(address market, uint32 newFixedTermEndTime)",
  "error IncreaseFixedTerm()",
  "error TermReductionDisabled()",
])

/**
 * AccessListRoleProvider (v2.5 borrower-administered allowlist).
 * `getCredential` returns `block.timestamp` for a member and 0 for everyone else
 * (v2.5-protocol/src/providers/AccessListRoleProvider.sol:105-110) — the hook then decides how
 * long that answer may be cached, via the per-hook TTL below.
 */
export const accessListProviderAbi = parseAbi([
  "function isMember(address account) view returns (bool)",
  "function getMembersCount() view returns (uint256)",
  "function getCredential(address account) view returns (uint32)",
  "function addMembers(address[] accounts)",
  "function removeMembers(address[] accounts)",
])

/**
 * BaseAccessControls provider administration — the hook side of a credential's lifetime.
 *
 * `addRoleProvider(provider, ttl)` on an ALREADY-approved provider only updates its
 * time-to-live (v2.5-protocol/src/access/BaseAccessControls.sol:256-259,:316-317), which is how
 * an administrator turns a non-cacheable provider into a cached one and back.
 *
 * `getRoleProvider` returns the packed `RoleProvider` word; the TTL is its top 32 bits
 * (src/types/RoleProvider.sol:15-27,:66-70 — `shl(0xe0, timeToLive)`), so a caller decodes it as
 * `raw >> 224n`. Read as uint256 because viem has no user-defined-value-type support.
 */
export const hooksProviderAdminAbi = parseAbi([
  "function getRoleProvider(address providerAddress) view returns (uint256)",
  "function addRoleProvider(address providerAddress, uint32 timeToLive)",
  "function removeRoleProvider(address providerAddress)",
])

/** Market functions beyond the minimal lender ABI (lenderflows/lib.ts). */
export const marketExtrasAbi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function totalDebts() view returns (uint256)",
  "function maxTotalSupply() view returns (uint256)",
  "function scaleFactor() view returns (uint256)",
  "function scaledBalanceOf(address account) view returns (uint256)",
  "function getUnpaidBatchExpiries() view returns (uint32[])",
  "function repayAndProcessUnpaidWithdrawalBatches(uint256 repayAmount, uint256 maxBatches)",
  "function queueFullWithdrawal() returns (uint32 expiry)",
])

/**
 * `currentState()` — the stored MarketState with the contract's own _getUpdatedState
 * projection applied at the current block: interest accrual plus the delinquency timer,
 * which _updateTimeDelinquentAndGetPenaltyTime grows 1:1 with elapsed time while the market
 * is delinquent and decays 1:1 (saturating at zero) while it is not. This is the state the
 * MarketLens views hand the app, so it — not the indexed snapshot — is what the UI renders.
 * V2.5's struct adds protocolFeeBips; both are static tuples, so a V1 market simply reverts
 * the V2 decode (see marketDelinquency in lenderflows/lib.ts).
 */
export const marketStateV2Abi = parseAbi([
  "struct MarketStateV2 { bool isClosed; uint128 maxTotalSupply; uint128 accruedProtocolFees; uint128 normalizedUnclaimedWithdrawals; uint104 scaledTotalSupply; uint104 scaledPendingWithdrawals; uint32 pendingWithdrawalExpiry; bool isDelinquent; uint32 timeDelinquent; uint16 protocolFeeBips; uint16 annualInterestBips; uint16 reserveRatioBips; uint112 scaleFactor; uint32 lastInterestAccruedTimestamp; }",
  "function currentState() view returns (MarketStateV2 state)",
])

export const marketStateV1Abi = parseAbi([
  "struct MarketStateV1 { bool isClosed; uint128 maxTotalSupply; uint128 accruedProtocolFees; uint128 normalizedUnclaimedWithdrawals; uint104 scaledTotalSupply; uint104 scaledPendingWithdrawals; uint32 pendingWithdrawalExpiry; bool isDelinquent; uint32 timeDelinquent; uint16 annualInterestBips; uint16 reserveRatioBips; uint112 scaleFactor; uint32 lastInterestAccruedTimestamp; }",
  "function currentState() view returns (MarketStateV1 state)",
])

/** ERC-4626 views for the market-token wrapper (share token == the wrapper contract). */
export const erc4626Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function previewDeposit(uint256 assets) view returns (uint256)",
  "function previewWithdraw(uint256 assets) view returns (uint256)",
  "function previewRedeem(uint256 shares) view returns (uint256)",
  "function maxDeposit(address owner) view returns (uint256)",
  "function maxRedeem(address owner) view returns (uint256)",
  "function maxWithdraw(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function asset() view returns (address)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
])

/**
 * Wildcat4626WrapperFactory — the SDK/app's configured wrapper factory, which on this generation
 * is the V2.5 FACADE: it owns a local registry for markets that declare a scaled-transfer
 * rounding and forwards everything older to its immutable `v1Factory`
 * (v2.5-protocol/src/vault/Wildcat4626WrapperFactory.sol:119-161). Discovery and deployment must
 * both go through it — `registeredWrapper()` exists only on V2.5+ markets.
 */
export const wrapperFactoryAbi = parseAbi([
  "function wrapperForMarket(address market) view returns (address wrapper)",
  "function isFloorRoundingMarket(address market) view returns (bool)",
  "function v1Factory() view returns (address)",
  "function archController() view returns (address)",
  "function createWrapper(address market) returns (address wrapper)",
  "error WrapperAlreadyExists(address market)",
  "error ZeroAddress()",
  "error NotRegisteredMarket(address market)",
  "error LegacyMarketsNotSupported(address market)",
  "error UnsupportedMarketRounding(address market, bytes32 rounding)",
  "error UnsupportedMarketTransferPolicy(address market, address hooks)",
  "error MarketTransfersDisabled(address market)",
])

/**
 * Generation probe. A V2.5 market declares `scaledTransferRounding()` (keccak256("scaleAmountDown"))
 * and records its wrapper in `registeredWrapper()`; a pre-V2.5 market has NEITHER function, so both
 * calls REVERT there. Never call these on a market whose generation has not been established.
 */
export const marketGenerationAbi = parseAbi([
  "function scaledTransferRounding() view returns (bytes32)",
  "function registeredWrapper() view returns (address)",
])

/** ArchController + testnet MockArchControllerOwner (borrower (de)registration). */
export const archControllerAbi = parseAbi([
  "function isRegisteredBorrower(address account) view returns (bool)",
  "function registerBorrower(address borrower)",
  "function removeBorrower(address borrower)",
])

/**
 * Decode-only extras: calls the APP sends that no helper sends itself (swept UI txs).
 * Never used for writes — only so decodeFunctionData can name them in the report.
 */
export const uiDecodeExtrasAbi = parseAbi([
  // ERC-4626 wrapper writes (wrap/unwrap market tokens through the app)
  "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
  "function mint(uint256 shares, address receiver) returns (uint256 assets)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)",
  // market/access-control writes reachable from the app UI
  "function removeMembers(address[] accounts)",
  "function forceBuyBack(address lender, uint256 amount)",
  "function nukeFromOrbit(address account)",
  "function blockFromDeposits(address account)",
  "function unblockFromDeposits(address account)",
  "function setMinimumDeposit(address market, uint128 newMinimumDeposit)",
  "function setFixedTermEndTime(address market, uint32 newFixedTermEndTime)",
  "function addRoleProvider(address providerAddress, uint32 timeToLive)",
  "function removeRoleProvider(address providerAddress)",
])

/**
 * Decode-only registry entry: `borrowerMarketAbi`/`marketExtrasAbi` already carry the writes the
 * helpers send; these are the periodic-APR writes the APP sends (AprModal's propose mode and
 * MarketTransactions' settle/apply plan) so the report names them instead of showing raw selectors.
 */
const periodicAprDecodeAbi = [
  ...periodicHooksAbi,
  ...marketAprExecutionAbi,
] as const

/** Flat registry the decoder scans by selector (first match wins; duplicates are harmless). */
export const DECODE_ABIS = [
  marketAbi,
  erc20Abi,
  erc20TransferAbi,
  borrowerMarketAbi,
  hooksExtrasAbi,
  fixedTermHooksAbi,
  accessListProviderAbi,
  hooksProviderAdminAbi,
  marketExtrasAbi,
  erc4626Abi,
  archControllerAbi,
  uiDecodeExtrasAbi,
  revolvingMarketAbi,
  periodicAprDecodeAbi,
  wrapperFactoryAbi,
].flat() as Abi
