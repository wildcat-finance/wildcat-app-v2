import { useLayoutEffect, useRef, useState } from "react"

import { Box } from "@mui/material"

import "./style.css"

import { BarItemProps } from "./interface"

export const BarItem = ({ chartItem, isOnlyBarItem }: BarItemProps) => {
  const [shouldDisplayValue, setShouldDisplayValue] = useState(true)

  const outerContainerRef = useRef<HTMLDivElement>(null)
  const innerContainerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const outerContainerWidth =
      outerContainerRef.current?.getBoundingClientRect().width
    const innerContainerWidth =
      innerContainerRef.current?.getBoundingClientRect().width

    if (outerContainerWidth && innerContainerWidth) {
      if (innerContainerWidth > outerContainerWidth) {
        setShouldDisplayValue(false)
      } else {
        setShouldDisplayValue(true)
      }
    }
  }, [chartItem.width])

  return (
    <Box
      className="barchart__item"
      ref={outerContainerRef}
      style={
        isOnlyBarItem
          ? {
              width: "100%",
              minWidth: "0.6%",
              backgroundColor: `${chartItem.color}`,
              position: "relative",
              borderRadius: "8px",
            }
          : {
              width: `${chartItem.width}%`,
              minWidth: "0.6%",
              backgroundColor: `${chartItem.color}`,
              position: "relative",
            }
      }
    >
      <Box
        ref={innerContainerRef}
        sx={{
          color: `${chartItem.textColor}`,
          width: "min-content",
        }}
      />
    </Box>
  )
}
