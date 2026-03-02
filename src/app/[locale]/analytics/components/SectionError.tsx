"use client"

import { T } from "../constants"

export function SectionError({
  label,
  error,
}: {
  label: string
  error: string
}) {
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.accentRed}30`,
        borderRadius: T.radius,
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <span
        style={{
          fontFamily: T.fontMono,
          fontSize: "14px",
          color: T.accentRed,
          opacity: 0.6,
        }}
      >
        ✕
      </span>
      <div>
        <span
          style={{
            fontFamily: T.fontBody,
            fontSize: "13px",
            color: T.textMuted,
          }}
        >
          {label}:
        </span>
        <span
          style={{
            fontFamily: T.fontMono,
            fontSize: "11px",
            color: T.textDim,
            marginLeft: "8px",
          }}
        >
          {error}
        </span>
      </div>
    </div>
  )
}
