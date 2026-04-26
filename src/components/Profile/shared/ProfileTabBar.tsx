"use client"

import { Box, Button } from "@mui/material"

import { COLORS } from "@/theme/colors"

import { ProfileTabDef, useProfileTab } from "./profileTabs"

export const ProfileTabBar = <T extends string>({
  tabs,
  defaultTab,
}: {
  tabs: ProfileTabDef<T>[]
  defaultTab: T
}) => {
  const { currentTab, setCurrentTab } = useProfileTab(tabs, defaultTab)

  return (
    <Box
      sx={{
        backgroundColor: COLORS.white,
        borderRadius: "14px",
        display: "flex",
        gap: "6px",
        overflowX: "auto",
        padding: "8px",
        scrollbarWidth: "none",
        width: "100%",
        "&::-webkit-scrollbar": {
          display: "none",
        },
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === currentTab

        return (
          <Button
            key={tab.value}
            type="button"
            variant="text"
            size="small"
            onClick={() => setCurrentTab(tab.value)}
            sx={{
              backgroundColor: isActive ? COLORS.whiteSmoke : "transparent",
              borderRadius: "10px",
              color: isActive ? COLORS.blackRock : COLORS.santasGrey,
              flexShrink: 0,
              fontSize: "12px",
              fontWeight: isActive ? 600 : 500,
              lineHeight: 1.2,
              minHeight: "36px",
              padding: "8px 10px",
              whiteSpace: "nowrap",
              "&:hover": {
                backgroundColor: COLORS.whiteSmoke,
              },
            }}
          >
            {tab.label}
          </Button>
        )
      })}
    </Box>
  )
}
