"use client"

import { Box, Button, Typography, useTheme } from "@mui/material"
import Link from "next/link"
import { Trans } from "react-i18next"

import { AgreementText } from "./components/AgreementText"
import { SignButton } from "./components/SignButton"

export default function Agreement() {
  const theme = useTheme()
  return (
    <Box
      className="text"
      sx={{
        padding: "50px 0 3px",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        [theme.breakpoints.down("sm")]: {
          padding: "32px 12px 12px",
        },
      }}
    >
      <Box
        sx={{
          maxWidth: "690px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="title2"
          fontWeight={600}
          sx={{
            marginBottom: "24px",
            [theme.breakpoints.down("sm")]: {
              marginBottom: "16px",
            },
          }}
        >
          <Trans i18nKey="agreement.page.title" />
        </Typography>

        <AgreementText />

        <Box
          sx={{
            position: "absolute",
            bottom: "0",
            height: "256px",
            width: "690px",
            backgroundImage:
              "linear-gradient(3deg, #FFFFFF 40%, #FFFFFF00 73%)",
            pointerEvents: "none",
            [theme.breakpoints.down("sm")]: {
              width: "100%",
            },
          }}
        />
      </Box>

      <Box
        sx={{
          position: "absolute",
          bottom: "0",
          width: "100%",
          justifyContent: "center",
          paddingBottom: "44px",
          display: "flex",
          gap: "16px",
          [theme.breakpoints.down("sm")]: {
            paddingBottom: "12px",
            paddingX: "12px",
            gap: "6px",
          },
        }}
      >
        <SignButton />

        <Link
          style={{
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            "@media (max-width: 600px)": {
              width: "100%",
            },
          }}
          href="/pdf/Wildcat_Terms_of_Use.pdf"
          target="_blank"
          download
        >
          <Button
            variant="contained"
            color="secondary"
            size="large"
            sx={{
              width: "168.63px",
              height: "44px",
              [theme.breakpoints.down("sm")]: {
                width: "100%",
              },
            }}
          >
            <Trans i18nKey="agreement.page.download" />
          </Button>
        </Link>
      </Box>
    </Box>
  )
}
