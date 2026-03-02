"use client"

import { T } from "../constants"

export function StatCard({
  label,
  value,
  subtitle,
  accent,
  warn,
  small,
}: {
  label: string
  value: string
  subtitle?: string
  accent?: boolean
  warn?: boolean
  small?: boolean
}) {
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${warn ? `${T.accentAmber}40` : T.border}`,
        borderRadius: T.radius,
        padding: small ? "14px 18px" : "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: T.fontBody,
          fontSize: small ? "11px" : "12px",
          fontWeight: 500,
          color: T.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: T.fontMono,
          fontSize: small ? "20px" : "26px",
          fontWeight: 600,
          // eslint-disable-next-line no-nested-ternary
          color: warn ? T.accentAmber : accent ? T.accent : T.text,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      {subtitle && (
        <span
          style={{
            fontFamily: T.fontBody,
            fontSize: "11px",
            color: T.textMuted,
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  )
}
