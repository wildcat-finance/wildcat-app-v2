"use client"

import { useState } from "react"

import { T } from "../../constants"

export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      style={{
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 0",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontFamily: T.fontMono,
            fontSize: "10px",
            color: T.textDim,
            transition: "transform 0.2s",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          &#9654;
        </span>
        <span
          style={{
            fontFamily: T.fontBody,
            fontSize: "13px",
            fontWeight: 600,
            color: T.text,
          }}
        >
          {title}
        </span>
        {count !== undefined && (
          <span
            style={{
              fontFamily: T.fontMono,
              fontSize: "10px",
              color: T.accent,
              background: `${T.accent}18`,
              padding: "1px 6px",
              borderRadius: "4px",
            }}
          >
            {count}
          </span>
        )}
      </div>
      {open && <div style={{ paddingBottom: "12px" }}>{children}</div>}
    </div>
  )
}
