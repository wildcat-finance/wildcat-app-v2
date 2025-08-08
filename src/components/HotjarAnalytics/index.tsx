"use client"

import { useEffect } from "react"

import Hotjar from "@hotjar/browser"

export default function HotjarAnalytics() {
  useEffect(() => {
    // Function to initialize Hotjar after user interaction
    const initHotjar = () => {
      const siteId = 6448402 // Replace with your Hotjar site ID
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
  }, [])

  return null
}
