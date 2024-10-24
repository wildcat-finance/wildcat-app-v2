import { useEffect, useRef } from "react"

interface UsePollingOptions {
  callback: () => void
  interval: number
}

export const usePolling = ({ callback, interval }: UsePollingOptions) => {
  const savedCallback = useRef<() => void>()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!interval || interval <= 0) return

    setInterval(() => {
      if (savedCallback.current) {
        savedCallback.current()
      }
    }, interval)

    if (savedCallback.current) {
      savedCallback.current()
    }
  }, [interval])
}
