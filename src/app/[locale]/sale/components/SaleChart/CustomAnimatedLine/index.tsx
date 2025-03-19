import * as React from "react"

import { useChartId, useDrawingArea, useXScale } from "@mui/x-charts/hooks"
import { AnimatedLine, AnimatedLineProps } from "@mui/x-charts/LineChart"

interface CustomAnimatedLineProps extends AnimatedLineProps {
  limit?: number
}

export function CustomAnimatedLine(props: CustomAnimatedLineProps) {
  const { limit, ...other } = props
  const { top, bottom, height, left, width } = useDrawingArea()
  const scale = useXScale()
  const chartId = useChartId()

  if (limit === undefined) {
    return <AnimatedLine {...other} />
  }

  const limitPosition = scale(limit) // Convert value to x coordinate.

  if (limitPosition === undefined) {
    return <AnimatedLine {...other} />
  }

  const clipIdLeft = `${chartId}-${props.ownerState.id}-line-limit-${limit}-1`
  const clipIdRight = `${chartId}-${props.ownerState.id}-line-limit-${limit}-2`

  return (
    <>
      <clipPath id={clipIdLeft}>
        <rect
          x={left}
          y={0}
          width={limitPosition - left}
          height={top + height + bottom}
        />
      </clipPath>
      <clipPath id={clipIdRight}>
        <rect
          x={limitPosition}
          y={0}
          width={left + width - limitPosition}
          height={top + height + bottom}
        />
      </clipPath>
      <g clipPath={`url(#${clipIdLeft})`} className="line-before">
        <AnimatedLine {...other} strokeWidth={2} />
      </g>
      <g clipPath={`url(#${clipIdRight})`} className="line-after">
        <AnimatedLine {...other} strokeWidth={1} />
      </g>
    </>
  )
}
