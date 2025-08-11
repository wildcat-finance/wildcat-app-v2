"use client"

import { useState, useEffect, useCallback, useRef } from "react"

import Hotjar from "@hotjar/browser"
import { Dialog, Typography, Box, Button } from "@mui/material"
import Cookies, { CookieAttributes } from "js-cookie"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setIsVisible } from "@/store/slices/cookieBannerSlice/cookieBannerSlice"
import { COLORS } from "@/theme/colors"

const CONSENT_KEY = "tracking_consent" as const
type ConsentType = "accepted" | "declined" | null

const COOKIE_OPTIONS_BASE: CookieAttributes = {
  expires: 365,
  sameSite: "strict",
}

const siteId = 6448402
const hotjarVersion = 6

const getCookieOptions = (): CookieAttributes => ({
  ...COOKIE_OPTIONS_BASE,
  secure:
    typeof window !== "undefined" && window.location.protocol === "https:",
})

export default function HotjarConsent() {
  const dispatch = useAppDispatch()
  const isVisible = useAppSelector((state) => state.cookieBanner.isVisible)

  const [consent, setConsent] = useState<ConsentType>(() => {
    if (typeof window === "undefined") return null
    return (Cookies.get(CONSENT_KEY) as ConsentType) ?? null
  })

  const hotjarStarted = useRef(false)

  useEffect(() => {
    if (consent !== "accepted") {
      return () => {}
    }

    // Function to initialize Hotjar after user interaction
    const initHotjar = () => {
      if (hotjarStarted.current) return
      hotjarStarted.current = true

      try {
        Hotjar.init(siteId, hotjarVersion)
        if (process.env.NODE_ENV === "development") {
          console.log("Hotjar initiated")
        }
      } catch (error) {
        console.error("Failed to initialize Hotjar:", error)
      }
    }

    const once: AddEventListenerOptions = { once: true }
    const passiveOnce: AddEventListenerOptions = { once: true, passive: true }

    const onKeyDown = (e: KeyboardEvent) => {
      const keys = [
        "Tab",
        "Enter",
        " ",
        "Spacebar",
        "ArrowDown",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "Home",
        "End",
      ]
      if (keys.includes(e.key)) initHotjar()
    }

    // Add event listeners for user interaction
    document.addEventListener("wheel", initHotjar, passiveOnce)
    document.addEventListener("touchmove", initHotjar, passiveOnce)
    window.addEventListener("scroll", initHotjar, passiveOnce)
    window.addEventListener("click", initHotjar, once)
    window.addEventListener("keydown", onKeyDown, once)

    // Cleanup event listeners if the component unmounts before interaction
    return () => {
      document.removeEventListener("wheel", initHotjar)
      document.removeEventListener("touchmove", initHotjar)
      window.removeEventListener("scroll", initHotjar)
      window.removeEventListener("click", initHotjar)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [consent])

  const handleCloseCookiesModal = () => {
    dispatch(setIsVisible(false))
  }

  const handleAccept = useCallback(() => {
    Cookies.set(CONSENT_KEY, "accepted", getCookieOptions())
    setConsent("accepted")
    handleCloseCookiesModal()
  }, [])

  const handleDecline = useCallback(() => {
    Cookies.set(CONSENT_KEY, "declined", getCookieOptions())
    setConsent("declined")
    handleCloseCookiesModal()
  }, [consent, dispatch])

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
