"use client"

import * as React from "react"
import { useState } from "react"

import { Box, Tab, Tabs } from "@mui/material"

import { ChartHeader } from "@/app/[locale]/sale/components/ChartHeader"
import { HistoryTable } from "@/app/[locale]/sale/components/HistoryTable"
import SaleChart from "@/app/[locale]/sale/components/SaleChart"
import { SaleSidebar } from "@/app/[locale]/sale/components/SaleSidebar"
import { COLORS } from "@/theme/colors"

import { DetailsSection } from "./components/DetailsSection"

const PageContainerStyles = {
  height: "calc(100vh - 62px)",
  display: "flex",
}

const ContentContainerStyles = {
  width: "100%",
  height: "calc(100vh - 61px)",
  overflow: "auto",
  overflowY: "auto",
}

const InnerContainerStyles = {
  width: "100%",
  padding: "32px 30px",
}

const ChartContainerStyles = {
  marginTop: "26px",
  width: "100%",
  backgroundColor: COLORS.hintOfRed,
  borderRadius: "12px",
}

const TabsContainerStyles = {
  marginTop: "44px",
  height: "41px",
  minHeight: "41px",
  "& .MuiTabs-flexContainer": {
    alignItems: "flex-end",
  },
}

const TabStyles = {
  fontSize: "13px",
  fontWeight: 500,
  lineHeight: "20px",
  height: "41px",
  minHeight: "41px",
  minWidth: "fit-content",
  padding: "0 4px",
  borderColor: COLORS.athensGrey,
}

const SeparatorStyles = {
  width: "10px",
  minWidth: "10px",
  height: "1px",
  backgroundColor: COLORS.athensGrey,
}

const FullWidthSeparatorStyles = {
  width: "100%",
  height: "1px",
  backgroundColor: COLORS.athensGrey,
}

const mockData = {
  hour: {
    historicalData: [100, 80, 75, 70, 65, 60],
    futureData: [25, 20, 15, 10],
  },
  day: {
    historicalData: [100, 85, 75, 70, 60, 58, 55, 52],
    futureData: [30, 28, 26, 24],
  },
  week: {
    historicalData: [100, 90, 80, 70],
    futureData: [30, 28],
  },
}

export default function SaleTokenPage() {
  const [tab, setTab] = useState<"details" | "history" | "sale">("details")
  const [period, setPeriod] = useState<"hour" | "day" | "week">("day")

  const address = "0xca732651410E915090d7A7D889A1E44eF4575fcE"

  const handleTabsChange = (
    event: React.SyntheticEvent,
    newTab: "details" | "history" | "sale",
  ) => {
    setTab(newTab)
  }

  return (
    <Box sx={PageContainerStyles}>
      <SaleSidebar
        tokenName="WLDC"
        tokenSymbol="$WLDC"
        sold="0.32%"
        raised="12000 $"
        saleEnd="12d 5h 23m"
      />

      <Box sx={ContentContainerStyles}>
        <Box sx={InnerContainerStyles}>
          <ChartHeader period={period} setPeriod={setPeriod} />

          <Box sx={ChartContainerStyles}>
            <SaleChart
              historicalData={mockData[period].historicalData}
              futureData={mockData[period].futureData}
              period={period}
            />
          </Box>

          <Tabs
            value={tab}
            onChange={handleTabsChange}
            sx={TabsContainerStyles}
          >
            <Box sx={SeparatorStyles} />
            <Tab value="details" label="LBP Details" sx={TabStyles} />
            <Tab value="history" label="Purchase History" sx={TabStyles} />
            <Tab value="sale" label="Sale Details" sx={TabStyles} />
            <Box sx={FullWidthSeparatorStyles} />
          </Tabs>

          {tab === "details" && <DetailsSection address={address} />}
          {tab === "history" && <HistoryTable />}
        </Box>
      </Box>
    </Box>
  )
}
