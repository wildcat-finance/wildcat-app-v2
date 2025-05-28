"use client"

import { Box, Button, Typography, useTheme } from "@mui/material"
import { Trans } from "react-i18next"

import { AgreementText } from "./components/AgreementText"
import { SignButton } from "./components/SignButton"

export default function Agreement() {
  const theme = useTheme()

  const handleDownload = () => {
    window.open(`/pdf/Wildcat_Terms_of_Use.pdf`, "_blank")
  }
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
          background: "white",
          borderRadius: "14px",
          height: "calc(100vh - 72px)",
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
          [theme.breakpoints.down("sm")]: {
            justifyContent: "start",
          },
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
              width: "calc(100% - 8px)",
              paddingX: "6px",
              borderRadius: "14px",
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
            width: "100%",
          },
        }}
      >
        <SignButton />

        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={handleDownload}
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
      </Box>
    </Box>
  )
}
