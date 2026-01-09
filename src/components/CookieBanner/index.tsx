"use client"

import { useState } from "react"

import { Dialog, Box, Typography, Button } from "@mui/material"
import Cookies from "js-cookie"

import { COLORS } from "@/theme/colors"

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _mtm: Array<{ [key: string]: any }>
  }
}

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)

  const loadMatomo = () => {
    if (typeof window === "undefined") return
    // eslint-disable-next-line no-underscore-dangle, no-multi-assign
    const _mtm = (window._mtm = window._mtm || [])
    _mtm.push({ "mtm.startTime": new Date().getTime(), event: "mtm.Start" })
    const d = document
    const g = d.createElement("script")
    const s = d.getElementsByTagName("script")[0]
    g.async = true
    g.src =
      "https://cdn.matomo.cloud/wildcatfinance.matomo.cloud/container_jeDotXew.js"
    s.parentNode?.insertBefore(g, s)
  }

  // useEffect(() => {
  //   const consent = Cookies.get("tracking_consent")
  //
  //   if (!consent) {
  //     setIsVisible(true)
  //   } else if (consent === "accepted") {
  //     loadMatomo()
  //   }
  // }, [])

  const handleAccept = () => {
    Cookies.set("tracking_consent", "accepted", { expires: 365 })
    setIsVisible(false)
    loadMatomo()
  }

  const handleDecline = () => {
    Cookies.set("tracking_consent", "declined", { expires: 365 })
    setIsVisible(false)
  }

  return (
    <Dialog
      open={isVisible}
      onClose={handleDecline}
      PaperProps={{
        sx: {
          position: "fixed",
          bottom: 16,
          left: 16,
          right: 16,
          m: 0,
          p: 2,
          bgcolor: COLORS.white,
          color: COLORS.blackRock,
          borderRadius: 1,
          boxShadow: 3,
        },
      }}
    >
      <Typography variant="body1" sx={{ mb: 2 }}>
        We use Matomo for anonymous analytics. Allow tracking?
      </Typography>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          onClick={handleAccept}
          variant="contained"
          color="success"
          sx={{ px: 2, py: 1 }}
        >
          Allow
        </Button>
        <Button
          onClick={handleDecline}
          variant="contained"
          color="error"
          sx={{ px: 2, py: 1 }}
        >
          Decline
        </Button>
      </Box>
    </Dialog>
  )
}
