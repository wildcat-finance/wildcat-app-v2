import { escapeHtml } from "@/components/ECharts/formatters"
import { COLORS } from "@/theme/colors"

// Local tooltip builders mirroring @/components/ECharts/formatters but without a
// hard-coded monospace font-family, so the markup inherits the Inter family set
// on the ECharts tooltip container (textStyle.fontFamily).

export const interTooltipShell = (header: string, rows: string) => `
  <div style="min-width: 160px; max-width: 360px; font-size: 11px; line-height: 1.45;">
    <div style="color: ${COLORS.santasGrey}; margin-bottom: 6px;">${escapeHtml(
      header,
    )}</div>
    ${rows}
  </div>
`

export const interTooltipRow = ({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) => `
  <div style="display: flex; align-items: center; gap: 8px; justify-content: space-between; min-width: 0; margin: 2px 0;">
    <span style="display: inline-flex; align-items: center; min-width: 0; color: ${
      COLORS.santasGrey
    };">
      <span style="width: 8px; height: 8px; flex: 0 0 auto; border-radius: 2px; background: ${color}; margin-right: 6px;"></span>
      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(
        label,
      )}</span>
    </span>
    <strong style="color: ${
      COLORS.white
    }; font-weight: 600; white-space: nowrap;">${escapeHtml(value)}</strong>
  </div>
`
