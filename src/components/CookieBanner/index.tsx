"use client"

import { useEffect, useState } from "react"

import { Dialog, Box, Typography, Button } from "@mui/material"
import Cookies from "js-cookie"

import { COLORS } from "@/theme/colors"
import { HotjarFn } from "@/types/hotjar"

const HOTJAR_ID = Number(process.env.NEXT_PUBLIC_HOTJAR_ID ?? 0)

export default function CookieBanner() {
  const [open, setOpen] = useState(false)

  const loadHotjar = () => {
    if (typeof window === "undefined" || window.hj) return

    const hjStub: HotjarFn = (...args: unknown[]) => {
      ;(hjStub.q = hjStub.q || []).push(args)
    }

    window.hj = hjStub
    // eslint-disable-next-line no-underscore-dangle
    window._hjSettings = { hjid: HOTJAR_ID, hjsv: 6 }

    const s = document.createElement("script")
    s.async = true
    s.src = `https://static.hotjar.com/c/hotjar-${HOTJAR_ID}.js?sv=6`
    document.head.appendChild(s)
  }

  useEffect(() => {
    const consent = Cookies.get("tracking_consent")
    if (!consent) setOpen(true)
    if (consent === "accepted") loadHotjar()
  }, [])

  const accept = () => {
    Cookies.set("tracking_consent", "accepted", { expires: 365 })
    setOpen(false)
    loadHotjar()
  }

  const decline = () => {
    Cookies.set("tracking_consent", "declined", { expires: 365 })
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
