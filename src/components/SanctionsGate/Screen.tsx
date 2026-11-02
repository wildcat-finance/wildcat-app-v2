"use client"

import { Box, Button, Typography } from "@mui/material"

import Logo from "@/assets/icons/logo_black.svg"
import { COLORS } from "@/theme/colors"

const copy = {
  title: "Wallet access restricted",
  body: "This address cannot use the Wildcat app because it was flagged by sanctions screening. If you believe this is an error, contact the Wildcat Foundation at contact@thewildcat.foundation.",
}

export function SanctionsScreen({
  address,
  onDisconnect,
  disconnecting,
  disconnectError,
}: {
  address?: string
  onDisconnect: () => void
  disconnecting?: boolean
  disconnectError?: boolean
}) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, sm: 4 },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 520,
          bgcolor: COLORS.white,
          borderRadius: "16px",
          p: { xs: 3, sm: 5 },
          boxShadow: "0 12px 48px #14141414",
        }}
      >
        <Box
          aria-label="Wildcat"
          sx={{ width: 140, mb: 5, "& svg": { width: "100%", height: "auto" } }}
        >
          <Logo />
        </Box>
        <Box aria-live="polite" aria-atomic="true">
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 24, sm: 28 },
              fontWeight: 600,
              lineHeight: 1.25,
              color: COLORS.bunker,
              mb: 2,
            }}
          >
            {copy.title}
          </Typography>
          {address && (
            <Typography
              component="p"
              sx={{
                fontFamily: "monospace",
                fontSize: 13,
                lineHeight: 1.6,
                overflowWrap: "anywhere",
                bgcolor: COLORS.whiteSmoke,
                borderRadius: "8px",
                p: 1.5,
                mb: 2,
                userSelect: "text",
                color: COLORS.blackRock,
              }}
            >
              {address}
            </Typography>
          )}
          <Typography
            component="p"
            sx={{
              fontSize: 15,
              lineHeight: 1.7,
              color: COLORS.blackRock07,
              overflowWrap: "anywhere",
              userSelect: "text",
            }}
          >
            {copy.body}
          </Typography>
        </Box>
        {disconnectError && (
          <Typography role="alert" sx={{ mt: 2, color: COLORS.dullRed }}>
            Couldn’t disconnect the wallet. Please try again.
          </Typography>
        )}
        <Button
          variant="contained"
          fullWidth
          onClick={onDisconnect}
          disabled={disconnecting}
          sx={{ mt: 4 }}
        >
          {disconnecting ? "Disconnecting…" : "Disconnect wallet"}
        </Button>
      </Box>
    </Box>
  )
}
