"use client"

import { useState } from "react"

import {
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import { PieTooltip } from "./ChartTooltip"
import { T, PIE_COLORS, type CompositionSlice } from "../constants"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActivePieShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius - 3}
      outerRadius={outerRadius + 5}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  )
}

export function CompositionPie({
  title,
  description,
  slices,
}: {
  title: string
  description: string
  slices: CompositionSlice[]
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: "20px 24px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          marginBottom: "8px",
        }}
      >
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
        <span
          style={{ fontFamily: T.fontBody, fontSize: "11px", color: T.textDim }}
        >
          {description}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "55%", height: 240 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                strokeWidth={0}
                onMouseEnter={(_, i) => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                activeIndex={activeIdx !== null ? activeIdx : undefined}
                activeShape={ActivePieShape}
              >
                {slices.map((s, i) => (
                  <Cell key={s.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {slices.map((s, i) => (
            <div
              key={s.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: activeIdx !== null && activeIdx !== i ? 0.4 : 1,
                transition: "opacity 0.15s",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "2px",
                  background: PIE_COLORS[i % PIE_COLORS.length],
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: T.fontBody,
                  fontSize: "12px",
                  color: T.text,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.name}
              </span>
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: "11px",
                  color: T.textMuted,
                  flexShrink: 0,
                }}
              >
                {s.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
