// ============================================================
// TYPES — Subgraph raw response shapes
// ============================================================

export interface RawMarket {
  id: string
  name: string
  borrower: string
  asset: { symbol: string; decimals: number; address: string }
  hooks: { kind: "OpenTerm" | "FixedTerm" | "Unknown" } | null
  annualInterestBips: number
  reserveRatioBips: number
  delinquencyFeeBips: number
  delinquencyGracePeriod: number
  maxTotalSupply: string
  scaledTotalSupply: string
  scaleFactor: string
  isDelinquent: boolean
  isIncurringPenalties: boolean
  isClosed: boolean
  totalBorrowed: string
  totalRepaid: string
  totalBaseInterestAccrued: string
  totalDelinquencyFeesAccrued: string
  totalProtocolFeesAccrued: string
  createdAt: number
}

export interface RawMarketDailyStats {
  market: {
    id: string
    asset: { decimals: number; address: string; isUsdStablecoin: boolean }
  }
  startTimestamp: number
  totalDeposited: string
  totalWithdrawalsRequested: string
  totalBorrowed: string
  totalRepaid: string
  totalDebt?: string
  scaledTotalSupply: string
  scaleFactor: string
  usdPrice: string | null
}

export interface RawMarketInterestAccrued {
  market: { id: string; asset: { decimals: number; address: string } }
  baseInterestAccrued: string
  delinquencyFeesAccrued: string
  protocolFeesAccrued: string
  blockTimestamp: number
}

export interface RawDelinquencyEvent {
  market: { id: string }
  isDelinquent: boolean
  blockTimestamp: number
}

// ============================================================
// TYPES — Component data shapes
// ============================================================

export interface ProtocolStats {
  tvl: number
  activeMarkets: number
  healthyMarkets: number
  delinquentMarkets: number
  penaltyMarkets: number
  closedMarkets: number
  totalBorrowers: number
  totalLenders: number
  openTermCount: number
  fixedTermCount: number
  avgAPRWeighted: number
  totalProtocolFees: number
  totalLenderInterest: number
  totalDelinquencyFees: number
}

export interface MarketSnapshot {
  id: string
  name: string
  borrower: string
  assetSymbol: string
  assetAddress: string
  assetDecimals: number
  debt: number
  capacity: number
  apr: number
  utilization: number
  isDelinquent: boolean
  isIncurringPenalties: boolean
  isClosed: boolean
  marketType: string
  protocolFees: number
  lenderInterest: number
}

export interface CompositionSlice {
  name: string
  value: number
  pct: number
}

export interface DailyProtocolPoint {
  date: string
  dateShort: string
  timestamp: number
  tvl: number
  dailyDeposits: number
  dailyWithdrawals: number
  dailyWithdrawalsNeg: number
  netFlow: number
  baseInterest: number
  delinquencyFees: number
  protocolFees: number
  protocolFeesDaily: number
  lenderInterestDaily: number
}

export interface DelinquencyDailyPoint {
  date: string
  dateShort: string
  timestamp: number
  delinquentCount: number
}

export interface DistributionBucket {
  range: string
  count: number
}

// ============================================================
// CONSTANTS & HELPERS
// ============================================================

export const SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_cmheai1ym00jyx7p27qn46qtm/subgraphs/mainnet/v2.0.24/gn"
export const RAY = 10n ** 27n

export const T = {
  bg: "#0a0e17",
  bgCard: "#111827",
  bgCardHover: "#1a2234",
  bgSkeleton: "#1e293b",
  border: "#1e293b",
  borderSubtle: "#162031",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  accent: "#22d3ee",
  accentGreen: "#34d399",
  accentRed: "#f87171",
  accentAmber: "#fbbf24",
  accentPurple: "#a78bfa",
  fontMono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
  fontBody: "'DM Sans', 'Satoshi', system-ui, sans-serif",
  radius: "10px",
  radiusSm: "6px",
} as const

export const PIE_COLORS = [
  T.accent,
  T.accentGreen,
  T.accentAmber,
  T.accentPurple,
  T.accentRed,
  "#818cf8",
  "#fb923c",
  "#38bdf8",
  "#e879f9",
  "#4ade80",
]

export const axisStyle = {
  fontFamily: T.fontMono,
  fontSize: 10,
  fill: T.textDim,
}
export const gridStyle = { stroke: T.borderSubtle, strokeDasharray: "3 3" }

export function toHuman(raw: string | bigint, decimals: number): number {
  return Number(typeof raw === "string" ? BigInt(raw) : raw) / 10 ** decimals
}
export function normalizeScaled(scaled: string, sf: string): bigint {
  return (BigInt(scaled) * BigInt(sf)) / RAY
}
export function fmtDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10)
}
export function fmtDateShort(ts: number): string {
  const d = new Date(ts * 1000)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
export function fmtUSD(v: number): string {
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}
export function fmtK(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v >= 1 ? `${Math.round(v)}` : v.toFixed(2)
}
export function truncAddr(a: string): string {
  return a.length <= 13 ? a : `${a.slice(0, 6)}...${a.slice(-4)}`
}
