import { Box, Typography } from "@mui/material"

import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"

export type ColumnHeaderTitleProps = {
  title: string
  tooltipText?: string
}

export const ColumnHeaderTitle = ({
  title,
  tooltipText,
}: ColumnHeaderTitleProps) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
    <Typography
      variant="text4"
      color={COLORS.santasGrey}
      sx={{
        ".MuiDataGrid-columnHeader--sorted &": {
          color: COLORS.ultramarineBlue,
        },
      }}
    >
      {title}
    </Typography>

    {tooltipText && <TooltipButton value={tooltipText} />}
  </Box>
)
