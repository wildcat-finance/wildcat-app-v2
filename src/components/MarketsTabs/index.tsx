import { Box, SxProps, Tab, Tabs, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"

import { MarketsTabsProps } from "./interface"

const TabsSx: SxProps<Theme> = {
  height: "28px",
  minHeight: "28px",
  "& .MuiTabs-scroller": {
    boxShadow: `inset 0 -1px 0 ${COLORS.whiteLilac}`,
  },
  "& .MuiTabs-flexContainer": {
    gap: "16px",
  },
}

const TabSx: SxProps<Theme> = {
  height: "28px",
  minHeight: "28px",
  minWidth: 0,
  maxWidth: "none",
  padding: "0 0 8px",
  borderBottom: "none",
  fontSize: pxToRem(13),
  lineHeight: lh(20, 13),
  fontWeight: 500,
  color: COLORS.blackRock,

  "&.Mui-selected": {
    color: COLORS.blackRock,
    fontWeight: 600,
  },
}

const LabelSx: SxProps<Theme> = {
  display: "inline-flex",
  flexDirection: "column",
  "&::after": {
    content: "attr(data-label)",
    height: 0,
    overflow: "hidden",
    visibility: "hidden",
    fontWeight: 600,
  },
}

export const MarketsTabs = <T extends string>({
  value,
  items,
  onChange,
  hideCounts,
}: MarketsTabsProps<T>) => (
  <Tabs
    value={value}
    onChange={(_, next: T) => onChange(next)}
    variant="scrollable"
    scrollButtons={false}
    sx={TabsSx}
  >
    {items.map((item) => (
      <Tab
        key={item.value}
        value={item.value}
        sx={TabSx}
        label={
          <Box
            component="span"
            sx={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <Box component="span" data-label={item.label} sx={LabelSx}>
              {item.label}
            </Box>
            {!hideCounts && !!item.count && (
              <Box
                component="span"
                sx={{ fontWeight: 500, color: COLORS.santasGrey }}
              >
                {item.count}
              </Box>
            )}
          </Box>
        }
      />
    ))}
  </Tabs>
)
