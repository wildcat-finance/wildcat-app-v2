"use client"

import { T } from "../constants"

export function SectionHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div style={{ padding: "8px 0 4px 0" }}>
      <h2
        style={{
          fontFamily: T.fontBody,
          fontSize: "16px",
          fontWeight: 600,
          color: T.text,
          margin: 0,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontFamily: T.fontBody,
            fontSize: "12px",
            color: T.textDim,
            margin: "2px 0 0 0",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
