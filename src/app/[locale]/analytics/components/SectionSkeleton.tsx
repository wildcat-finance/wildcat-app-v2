"use client"

import { T } from "../constants"

export function SectionSkeleton({
  height = 200,
  label,
}: {
  height?: number
  label?: string
}) {
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: "20px 24px",
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: T.fontMono,
          fontSize: "12px",
          color: T.textDim,
          opacity: 0.5,
        }}
      >
        {label || "Loading..."}
      </span>
    </div>
  )
}
