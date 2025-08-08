"use client"

import { useState, useEffect, useCallback } from "react"

import Hotjar from "@hotjar/browser"
import { Dialog, Typography, Box, Button } from "@mui/material"
import Cookies from "js-cookie"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setIsVisible } from "@/store/slices/cookieBannerSlice/cookieBannerSlice"
import { COLORS } from "@/theme/colors"

const CONSENT_KEY = "tracking_consent" as const

type ConsentType = "accepted" | "declined" | null

export default function HotjarConsent() {
  const dispatch = useAppDispatch()

  const [consent, setConsent] = useState<ConsentType>(() => {
    if (typeof window === "undefined") return null
    return (Cookies.get(CONSENT_KEY) as ConsentType) ?? null
  })

  useEffect(() => {
    if (consent !== "accepted") {
      return () => {}
    }

    // Function to initialize Hotjar after user interaction
    const initHotjar = () => {
      const siteId = 6448402
      const hotjarVersion = 6

      try {
        Hotjar.init(siteId, hotjarVersion)
      } catch (error) {
        console.error("Failed to initialize Hotjar:", error)
      } finally {
        if (process.env.NODE_ENV === "development") {
          console.log("Hotjar initiated")
        }
      }

      // Remove event listeners after Hotjar is initialized
      window.removeEventListener("click", initHotjar)
      window.removeEventListener("scroll", initHotjar)
    }

    // Add event listeners for user interaction (click and scroll)
    window.addEventListener("click", initHotjar)
    window.addEventListener("scroll", initHotjar)

    // Cleanup event listeners if the component unmounts before interaction
    return () => {
      window.removeEventListener("click", initHotjar)
      window.removeEventListener("scroll", initHotjar)
    }
  }, [consent])

  const handleCloseCookiesModal = () => {
    dispatch(setIsVisible(false))
  }

  const handleAccept = useCallback(() => {
    Cookies.set(CONSENT_KEY, "accepted", { expires: 365 })
    setConsent("accepted")
    handleCloseCookiesModal()
  }, [])

  const handleDecline = useCallback(() => {
    Cookies.set(CONSENT_KEY, "declined", { expires: 365 })
    setConsent("declined")
    handleCloseCookiesModal()
  }, [])

  const isVisible = useAppSelector((state) => state.cookieBanner.isVisible)

  useEffect(() => {
    if (consent === null) {
      dispatch(setIsVisible(true))
    }
  }, [])

  return (
    <Dialog
      open={isVisible}
      onClose={handleCloseCookiesModal}
      PaperProps={{
        sx: {
          position: "fixed",
          bottom: 16,
          left: 16,
          right: 16,
          m: 0,
          p: 2,
          width: "fit-content",
          padding: "20px 32px 20px 20px",
          bgcolor: COLORS.white,
          color: COLORS.blackRock,
          borderRadius: "10px",
          boxShadow: 3,
        },
      }}
    >
      <Typography variant="text2" fontWeight={600} sx={{ mb: "4px" }}>
        Manage Tracking
      </Typography>
      <Typography variant="text2" fontWeight={400} sx={{ mb: "20px" }}>
        We use Hotjar for anonymous analytics. Allow tracking?
      </Typography>

      <Box sx={{ display: "flex", gap: "8px" }}>
        <Button
          onClick={handleAccept}
          variant="contained"
          sx={{ padding: "6px 15px", borderRadius: "8px", height: "32px" }}
        >
          Allow
        </Button>
        <Button
          onClick={handleDecline}
          variant="contained"
          color="secondary"
          sx={{ padding: "6px 15px", borderRadius: "8px", height: "32px" }}
        >
          Decline
        </Button>
      </Box>
    </Dialog>
  )
}
