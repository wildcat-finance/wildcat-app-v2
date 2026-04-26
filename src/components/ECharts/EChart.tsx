"use client"

import * as React from "react"

import { Box, Button } from "@mui/material"
import {
  BarChart,
  HeatmapChart,
  LineChart,
  PieChart,
  ScatterChart,
} from "echarts/charts"
import {
  DataZoomComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components"
import * as echarts from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"

import DownloadIcon from "@/assets/icons/fullArrow_icon.svg"
import { COLORS } from "@/theme/colors"

import { EChartOption } from "./types"

echarts.use([
  BarChart,
  HeatmapChart,
  LineChart,
  PieChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  GraphicComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  VisualMapComponent,
  CanvasRenderer,
])

type EChartProps = {
  option: EChartOption
  height?: number | string
  ariaLabel?: string
  onReady?: (instance: echarts.ECharts | null) => void
  showExportActions?: boolean
  exportButtonVariant?: "icon" | "text"
  csvContent?: string
  csvFileName?: string
  imageFileName?: string
}

const ExportButton = ({
  label,
  onClick,
  variant,
}: {
  label: string
  onClick: () => void
  variant: "icon" | "text"
}) => (
  <Button
    onClick={onClick}
    size="small"
    variant="outlined"
    color="secondary"
    endIcon={variant === "icon" ? <DownloadIcon /> : undefined}
    sx={{
      minWidth: 0,
      height: 24,
      padding: "3px 8px",
      fontSize: 10,
      fontWeight: 400,
      lineHeight: 1,
      color: variant === "text" ? COLORS.santasGrey : undefined,
      borderColor: COLORS.athensGrey,
      backgroundColor: variant === "text" ? "transparent" : COLORS.white,
      textTransform: "none",
      "&:hover": {
        borderColor: COLORS.iron,
        backgroundColor:
          variant === "text" ? COLORS.blackRock006 : COLORS.white,
      },
      "& .MuiButton-endIcon": {
        marginLeft: "3px",
        marginRight: 0,
        "& svg": {
          height: 10,
          width: 10,
        },
        "& path": {
          fill: "currentColor",
        },
      },
    }}
  >
    {label}
  </Button>
)

export const EChart = ({
  option,
  height = "100%",
  ariaLabel,
  onReady,
  showExportActions = false,
  exportButtonVariant = "icon",
  csvContent,
  csvFileName = "chart.csv",
  imageFileName = "chart.png",
}: EChartProps) => {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const instanceRef = React.useRef<echarts.ECharts | null>(null)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return undefined

    const instance =
      echarts.getInstanceByDom(element) ??
      echarts.init(element, null, { renderer: "canvas" })

    instanceRef.current = instance
    onReady?.(instance)

    const observer = new ResizeObserver(() => {
      instance.resize()
    })
    observer.observe(element)

    return () => {
      observer.disconnect()
      onReady?.(null)
      instance.dispose()
      instanceRef.current = null
    }
  }, [onReady])

  React.useEffect(() => {
    const instance = instanceRef.current
    if (!instance) return

    const currentOption = (instance.getOption() ?? {}) as {
      dataZoom?: Array<{
        start?: number
        end?: number
        startValue?: number | string
        endValue?: number | string
      }>
    }
    const nextOption = { ...option } as EChartOption & {
      dataZoom?: Array<Record<string, unknown>>
    }

    if (Array.isArray(nextOption.dataZoom) && currentOption.dataZoom?.length) {
      nextOption.dataZoom = nextOption.dataZoom.map((zoom, index) => {
        const currentZoom = currentOption.dataZoom?.[index]
        if (!currentZoom) return zoom

        return {
          ...zoom,
          start: currentZoom.start,
          end: currentZoom.end,
          startValue: currentZoom.startValue,
          endValue: currentZoom.endValue,
        }
      })
    }

    instance.setOption(nextOption, {
      notMerge: true,
      lazyUpdate: true,
    })
  }, [option])

  const download = React.useCallback((href: string, fileName: string) => {
    const link = document.createElement("a")
    link.href = href
    link.download = fileName
    link.click()
  }, [])

  const handleCsvExport = React.useCallback(() => {
    if (!csvContent) return

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    download(url, csvFileName)
    URL.revokeObjectURL(url)
  }, [csvContent, csvFileName, download])

  const handlePngExport = React.useCallback(() => {
    const instance = instanceRef.current
    if (!instance) return

    download(
      instance.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      }),
      imageFileName,
    )
  }, [download, imageFileName])

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height,
        minHeight: typeof height === "number" ? `${height}px` : height,
      }}
    >
      {showExportActions && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            gap: "4px",
            zIndex: 1,
          }}
        >
          {csvContent && (
            <ExportButton
              label="CSV"
              onClick={handleCsvExport}
              variant={exportButtonVariant}
            />
          )}
          <ExportButton
            label="PNG"
            onClick={handlePngExport}
            variant={exportButtonVariant}
          />
        </Box>
      )}
      <Box
        ref={ref}
        role="img"
        aria-label={ariaLabel}
        sx={{
          width: "100%",
          height: "100%",
        }}
      />
    </Box>
  )
}
