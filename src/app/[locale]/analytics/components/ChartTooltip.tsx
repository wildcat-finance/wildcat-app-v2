"use client"

import { T, fmtUSD } from "../constants"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: "#1a2234ee",
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        padding: "10px 14px",
        fontFamily: T.fontMono,
        fontSize: "11px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ color: T.textMuted, marginBottom: "6px" }}>{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload
        .filter((p: { value: number }) => p.value !== 0)
        .map((p: { name: string; value: number; color: string }) => (
          <div
            key={p.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "2px",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "2px",
                background: p.color,
              }}
            />
            <span style={{ color: T.textDim }}>{p.name}:</span>
            <span style={{ color: T.text, fontWeight: 600 }}>
              {typeof p.value === "number" && Math.abs(p.value) >= 100
                ? fmtUSD(Math.abs(p.value))
                : Math.abs(p.value).toFixed(2)}
            </span>
          </div>
        ))}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div
      style={{
        background: "#1a2234ee",
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        padding: "10px 14px",
        fontFamily: T.fontMono,
        fontSize: "11px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ color: T.text, fontWeight: 600, marginBottom: "2px" }}>
        {d.name}
      </div>
      <div style={{ color: T.textMuted }}>
        {fmtUSD(d.value)} ({d.payload.pct.toFixed(1)}%)
      </div>
    </div>
  )
}
