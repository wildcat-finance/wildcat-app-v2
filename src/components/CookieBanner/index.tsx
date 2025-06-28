"use client"

import { useState, useEffect } from "react"

import { Dialog, Box, Typography, Button } from "@mui/material"
import Cookies from "js-cookie"

import { COLORS } from "@/theme/colors"

export default function CookieBanner() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!Cookies.get("tracking_consent")) setOpen(true)
  }, [])

  const accept = () => {
    Cookies.set("tracking_consent", "accepted", {
      expires: 365,
      sameSite: "strict",
      secure: true,
    })
    setOpen(false)
  }

  const decline = () => {
    Cookies.set("tracking_consent", "declined", {
      expires: 365,
      sameSite: "strict",
      secure: true,
    })
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onClose={decline}
      PaperProps={{
        sx: {
          position: "fixed",
          bottom: 16,
          left: 16,
          right: 16,
          p: 2,
          bgcolor: COLORS.white,
          color: COLORS.blackRock,
          borderRadius: 1,
          boxShadow: 3,
        },
      }}
    >
      <Typography sx={{ mb: 2 }}>
        We use Hotjar for anonymous analytics. Allow tracking?
      </Typography>

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button onClick={accept} variant="contained" color="success">
          Allow
        </Button>
        <Button onClick={decline} variant="contained" color="error">
          Decline
        </Button>
      </Box>
    </Dialog>
  )
}
