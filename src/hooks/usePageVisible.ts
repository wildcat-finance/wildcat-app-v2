import { useEffect, useState } from "react"

export const usePageVisible = (): boolean => {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === "undefined") return true
    return document.visibilityState === "visible"
  })

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible")
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return isVisible
}
