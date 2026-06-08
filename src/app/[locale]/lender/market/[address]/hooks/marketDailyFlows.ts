import { formatUnits } from "ethers/lib/utils"

export type MarketDailyFlowStat = {
  startTimestamp: number
  dayDeposited: string
  dayWithdrawalsRequested: string
  dayWithdrawalsExecuted: string
}

export type DailyFlowPoint = {
  date: string
  dateShort: string
  timestamp: number
  dailyDeposit: number
  dailyWithdrawalRequested: number
  dailyWithdrawalExecuted: number
  dailyWithdrawalRequestedNeg: number
  dailyWithdrawalExecutedNeg: number
  netFlow: number
}

function formatDateShort(ts: number): string {
  const d = new Date(ts * 1000)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

function formatDateISO(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

export function toDailyFlows(
  stats: MarketDailyFlowStat[],
  decimals: number,
): DailyFlowPoint[] {
  let cumDep = 0
  let cumReq = 0
  let cumExec = 0

  return stats.map((s) => {
    const dep = parseFloat(formatUnits(s.dayDeposited, decimals))
    const req = parseFloat(formatUnits(s.dayWithdrawalsRequested, decimals))
    const exec = parseFloat(formatUnits(s.dayWithdrawalsExecuted, decimals))
    cumDep += dep
    cumReq += req
    cumExec += exec

    return {
      date: formatDateISO(s.startTimestamp),
      dateShort: formatDateShort(s.startTimestamp),
      timestamp: s.startTimestamp,
      dailyDeposit: dep,
      dailyWithdrawalRequested: req,
      dailyWithdrawalExecuted: exec,
      dailyWithdrawalRequestedNeg: -req,
      dailyWithdrawalExecutedNeg: -exec,
      netFlow: cumDep - cumReq,
    }
  })
}
