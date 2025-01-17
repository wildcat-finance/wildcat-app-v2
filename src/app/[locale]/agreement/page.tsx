"use client"

import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { Trans } from "react-i18next"

import { AgreementText } from "./components/AgreementText"
import { SignButton } from "./components/SignButton"

export default function Agreement() {
  return (
    <Box
      className="text"
      sx={{
        padding: "50px 0 3px",
        width: "100%",
        display: "flex",
        justifyContent: "center",
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
        <Typography variant="title2" fontWeight={600} marginBottom="24px">
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
        }}
      >
        <SignButton />

        <Link href="/pdf/Wildcat_Terms_of_Use.pdf" target="_blank" download>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            sx={{ width: "168.63px", height: "44px" }}
          >
            <Trans i18nKey="agreement.page.download" />
          </Button>
        </Link>
      </Box>
    </Box>
  )
}
