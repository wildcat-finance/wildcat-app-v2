import { useEffect, useRef } from "react"

export function useIframeHeight<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const send = () => {
      const h = el.offsetHeight
      if (h > 0)
        window.parent.postMessage({ type: "iframe-height", height: h }, "*")
    }

    const sendAfterPaint = () => requestAnimationFrame(send)

    const ro = new ResizeObserver(sendAfterPaint)
    ro.observe(el)

    window.addEventListener("load", sendAfterPaint)

    // eslint-disable-next-line consistent-return
    return () => {
      ro.disconnect()
      window.removeEventListener("load", sendAfterPaint)
    }
  }, [])

  return ref
}
