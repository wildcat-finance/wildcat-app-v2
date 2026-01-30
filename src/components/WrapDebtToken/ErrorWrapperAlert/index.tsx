import React from "react"

import { Box, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { COLORS } from "@/theme/colors"

export type WrapperFormProps = {
  isWrapping?: boolean
}

export const ErrorWrapperAlert = ({ isWrapping }: WrapperFormProps) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "16px",
        borderRadius: "13px",
        backgroundColor: COLORS.remy,
        position: "relative",
        marginTop: "24px",
      }}
    >
      {/* Triangle pointer */}
      <Box
        sx={{
          position: "absolute",
          top: "-12px",
          right: "55px",
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderBottom: `12px solid ${COLORS.remy}`,
        }}
      />

      <Typography variant="text2" color={COLORS.dullRed}>
        Oops! Something goes wrong. {isWrapping ? "Wrap" : "Unwrap"} Tokens
        again
      </Typography>

      <Box sx={{ display: "flex", gap: "2px" }}>
        <Typography variant="text4" color={COLORS.dullRed08}>
          Explanatory message about the problem.
        </Typography>

        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <Link
          href="#"
          style={{
            display: "flex",
            color: COLORS.dullRed08,
            textDecorationLine: "underline",
          }}
        >
          <Typography variant="text4" color={COLORS.dullRed08}>
            {" "}
            View on Ethescan
          </Typography>
        </Link>
      </Box>
    </Box>
  )
}
