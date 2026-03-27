import { useEffect, useState } from "react"

import { theme } from "@/theme/theme"

const MOBILE_QUERY = theme.breakpoints.down("md").replace("@media ", "")

export const useMobileResolution = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    setIsMobile(mql.matches)

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  return isMobile
}
