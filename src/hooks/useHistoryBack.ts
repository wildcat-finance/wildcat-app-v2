import { useCallback } from "react"

import { useRouter } from "next/navigation"

export const useHistoryBack = (fallback: string) => {
  const router = useRouter()

  return useCallback(() => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.replace(fallback)
    }
  }, [router, fallback])
}
