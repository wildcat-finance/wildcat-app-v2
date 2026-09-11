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

/** BaseAccessControls (hooks instance) + MarketConstraintHooks views. */
export const hooksExtrasAbi = parseAbi([
  "function getPreviousLenderStatus(address account) view returns ((bool isBlockedFromDeposits, address lastProvider, bool canRefresh, uint32 lastApprovalTimestamp))",
  "function temporaryExcessReserveRatio(address market) view returns (uint16 originalAnnualInterestBips, uint16 originalReserveRatioBips, uint32 expiry)",
])

/**
 * FixedTermHooks — the administrator-only maturity setter and the per-market record it writes.
 * `getHookedMarket` is the authority on the CURRENT maturity: the subgraph's
 * `hooksConfig.fixedTermEndTime` is an indexed copy that lags a `FixedTermUpdated` event.
 *
 * The struct is byte-identical across generations (v2-protocol and v2.5-protocol
 * src/access/FixedTermHooks.sol:13 declare the same nine fields in the same order), and the call
 * was verified against a LIVE V2 hooks instance on the main fork before this was written.
 */
export const fixedTermHooksAbi = parseAbi([
  "function getHookedMarket(address market) view returns ((bool isHooked, bool transferRequiresAccess, bool depositRequiresAccess, bool withdrawalRequiresAccess, uint128 minimumDeposit, uint32 fixedTermEndTime, bool transfersDisabled, bool allowClosureBeforeTerm, bool allowTermReduction))",
  "error IncreaseFixedTerm()",
  "error TermReductionDisabled()",
])

/** AccessListRoleProvider (v2.5 borrower-administered allowlist). */
export const accessListProviderAbi = parseAbi([
  "function isMember(address account) view returns (bool)",
  "function addMembers(address[] accounts)",
  // Only an access-list provider answers this; every other role provider reverts, so it is the
  // discriminator the suite needs: subgraph v2.1.8 exposes no provider taxonomy on `RoleProvider`
  // (no `kind`, no `administrator`), and this call supplies both facts from the contract.
  "function administrator() view returns (address)",
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

/** ERC-4626 views for the market-token wrapper (share token == the wrapper contract). */
export const erc4626Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function previewRedeem(uint256 shares) view returns (uint256)",
  "function maxRedeem(address owner) view returns (uint256)",
  "function maxWithdraw(address owner) view returns (uint256)",
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

/** Flat registry the decoder scans by selector (first match wins; duplicates are harmless). */
export const DECODE_ABIS = [
  marketAbi,
  erc20Abi,
  erc20TransferAbi,
  borrowerMarketAbi,
  hooksExtrasAbi,
  fixedTermHooksAbi,
  accessListProviderAbi,
  marketExtrasAbi,
  erc4626Abi,
  archControllerAbi,
  uiDecodeExtrasAbi,
].flat() as Abi
