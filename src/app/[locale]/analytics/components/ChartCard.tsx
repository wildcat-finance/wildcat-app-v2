"use client"

import { T } from "../constants"

export function ChartCard({
  title,
  description,
  children,
  height = 280,
  fullWidth,
  timeRange,
  onTimeRangeChange,
}: {
  title: string
  description?: string
  children: React.ReactNode
  height?: number
  fullWidth?: boolean
  timeRange?: string
  onTimeRangeChange?: (r: string) => void
}) {
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: "20px 24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span
            style={{
              fontFamily: T.fontBody,
              fontSize: "14px",
              fontWeight: 600,
              color: T.text,
            }}
          >
            {title}
          </span>
          {description && (
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: "11px",
                color: T.textDim,
                maxWidth: "460px",
              }}
            >
              {description}
            </span>
          )}
        </div>
        {timeRange !== undefined && (
          <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
            {["7d", "30d", "90d", "1y", "All"].map((r) => (
              <span
                key={r}
                onClick={() => onTimeRangeChange?.(r)}
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "10px",
                  color: timeRange === r ? T.accent : T.textDim,
                  background: timeRange === r ? `${T.accent}18` : "transparent",
                  padding: "3px 7px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {r}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ width: "100%", height }}>{children}</div>
    </div>
  )
}
