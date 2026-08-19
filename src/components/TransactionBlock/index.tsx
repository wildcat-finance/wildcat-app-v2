import * as React from "react"

import { Box, Divider, Typography } from "@mui/material"

import { TooltipButton } from "@/components/TooltipButton"
import { TransactionBlockProps } from "@/components/TransactionBlock/interface"
import { COLORS } from "@/theme/colors"

import {
  AmountContainer,
  BlockContainer,
  RowContainer,
  RowsContainer,
  TitleContainer,
  TopRowContainer,
} from "./style"

export const TransactionBlock = ({
  title,
  tooltip,
  amount,
  warning,
  asset,
  children,
  subtitle,
  status,
  rows,
}: TransactionBlockProps) => (
  <Box sx={BlockContainer}>
    {/* Header group: the subtitle sits OUTSIDE the row that holds the action
        button, so it spans the full card width instead of the leftover column. */}
    <Box>
      <Box sx={TopRowContainer}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={TitleContainer}>
            <Typography
              variant="text4"
              sx={{ color: COLORS.manate, whiteSpace: "nowrap" }}
            >
              {title}
            </Typography>
            <TooltipButton value={tooltip} />
          </Box>

          <Box sx={AmountContainer}>
            <Typography
              variant="title3"
              sx={{
                color: warning ? COLORS.carminePink : "",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={amount}
            >
              {amount}
            </Typography>
            <Typography
              variant="text4"
              sx={{
                marginTop: "6px",
                color: warning ? COLORS.carminePink : COLORS.manate,
              }}
            >
              {asset}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex: "0 0 auto" }}>{children}</Box>
      </Box>

      {subtitle !== undefined && (
        <Typography
          variant="text4"
          sx={{
            color: COLORS.manate,
            marginTop: "4px",
            display: "block",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle || "\u00A0"}
        </Typography>
      )}

      {status && (
        <Typography
          variant="text4"
          sx={{
            color: COLORS.santasGrey,
            marginTop: "8px",
            display: "block",
          }}
        >
          {status}
        </Typography>
      )}
    </Box>

    {!!rows?.length && (
      <>
        <Divider sx={{ borderColor: COLORS.whiteLilac }} />

        <Box sx={RowsContainer}>
          {rows.map((row) => (
            <Box key={row.label} sx={RowContainer}>
              <Typography
                variant="text4"
                sx={{
                  color: COLORS.manate,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {row.label}
              </Typography>
              <Typography
                variant="text4"
                sx={{
                  color: COLORS.blackRock,
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={row.value}
              >
                {row.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </>
    )}
  </Box>
)
