import { COLORS } from "@/theme/colors"

export const formatCompactNumber = (value: number) => {
  if (!Number.isFinite(value)) return "0"

  const abs = Math.abs(value)
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  if (abs >= 1) return value.toFixed(value % 1 === 0 ? 0 : 1)

  return value.toFixed(2)
}

export const formatUsdCompact = (value: number) =>
  `$${formatCompactNumber(value)}`

export const formatChartDate = (timestampMs: number) => {
  const date = new Date(timestampMs)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

export const formatAxisDate = (timestampMs: number) => {
  const date = new Date(timestampMs)
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`
}

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")

export const tooltipShell = (header: string, rows: string) => `
  <div style="
    min-width: 160px;
    max-width: 360px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 11px;
    line-height: 1.45;
  ">
    <div style="color: ${COLORS.santasGrey}; margin-bottom: 6px;">${escapeHtml(
      header,
    )}</div>
    ${rows}
  </div>
`

export const tooltipRow = ({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) => `
  <div style="
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: space-between;
    min-width: 0;
    margin: 2px 0;
  ">
    <span style="
      display: inline-flex;
      align-items: center;
      min-width: 0;
      color: ${COLORS.santasGrey};
    ">
      <span style="
        width: 8px;
        height: 8px;
        flex: 0 0 auto;
        border-radius: 2px;
        background: ${color};
        margin-right: 6px;
      "></span>
      <span style="
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">${escapeHtml(label)}</span>
    </span>
    <strong style="
      color: ${COLORS.white};
      font-weight: 600;
      white-space: nowrap;
    ">${escapeHtml(value)}</strong>
  </div>
`
