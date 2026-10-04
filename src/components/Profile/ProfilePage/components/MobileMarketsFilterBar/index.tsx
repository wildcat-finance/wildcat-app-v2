import { ReactNode } from "react"

import { Box } from "@mui/material"

import { MobileSwitcherButton } from "@/components/Mobile/MobileSwitcherButton"
import { COLORS } from "@/theme/colors"

export type MobileMarketsFilterBarProps = {
  tabs: { id: string; label: string; amount?: number }[]
  tabsLabel: string
  activeTab: string
  onTabChange: (id: string) => void
  actions: ReactNode
}

export const MobileMarketsFilterBar = ({
  tabs,
  tabsLabel,
  activeTab,
  onTabChange,
  actions,
}: MobileMarketsFilterBarProps) => (
  <Box
    sx={{
      width: "100%",
      marginTop: "4px",
      padding: "16px 8px",
      borderRadius: "14px",
      backgroundColor: COLORS.white,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "8px",
    }}
  >
    {/* 2px down so the first row of 28px tabs centres on the 32px buttons */}
    <Box
      role="group"
      aria-label={tabsLabel}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        minWidth: 0,
        paddingTop: "2px",
      }}
    >
      {tabs.map((tab) => (
        <MobileSwitcherButton
          key={tab.id}
          label={tab.label}
          amount={tab.amount}
          active={tab.id === activeTab}
          onClick={() => onTabChange(tab.id)}
        />
      ))}
    </Box>

    <Box sx={{ display: "flex", gap: "4px", flexShrink: 0 }}>{actions}</Box>
  </Box>
)
