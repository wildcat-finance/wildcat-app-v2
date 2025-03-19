import * as React from "react"
import { Dispatch, SetStateAction } from "react"

import { Box, Button, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type ChartHeaderProps = {
  period: "hour" | "day" | "week"
  setPeriod: Dispatch<SetStateAction<"hour" | "day" | "week">>
}

export const ChartHeader = ({ period, setPeriod }: ChartHeaderProps) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
    }}
  >
    <Box>
      <Typography variant="text3" color={COLORS.santasGrey}>
        Price per Token
      </Typography>
      <Box sx={{ display: "flex", gap: "4px", alignItems: "flex-end" }}>
        <Typography variant="title2">4.5</Typography>

        <Typography variant="text3" marginBottom="2px">
          USDC
        </Typography>

        <Typography
          variant="text3"
          marginBottom="2px"
          color={COLORS.carminePink}
        >
          -3.87%
        </Typography>
      </Box>
    </Box>

    <Box sx={{ display: "flex", gap: "2px" }}>
      <Button
        variant="contained"
        color="secondary"
        size="small"
        sx={{
          minWidth: "48px",
          backgroundColor:
            period === "hour" ? COLORS.whiteSmoke : "transparent",
        }}
        onClick={() => setPeriod("hour")}
      >
        1H
      </Button>

      <Button
        variant="contained"
        color="secondary"
        size="small"
        sx={{
          minWidth: "48px",
          backgroundColor: period === "day" ? COLORS.whiteSmoke : "transparent",
        }}
        onClick={() => setPeriod("day")}
      >
        1D
      </Button>

      <Button
        variant="contained"
        color="secondary"
        size="small"
        sx={{
          minWidth: "48px",
          backgroundColor:
            period === "week" ? COLORS.whiteSmoke : "transparent",
        }}
        onClick={() => setPeriod("week")}
      >
        1W
      </Button>
    </Box>
  </Box>
)
