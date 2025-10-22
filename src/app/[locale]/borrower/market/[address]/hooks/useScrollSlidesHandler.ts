import { useState, useEffect, useRef, RefObject } from "react"

import { useDispatch } from "react-redux"
import { match, P } from "ts-pattern"

import { setCheckBlock } from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"

const useScrollSlidesHandler = (
  slidesCount: number,
  checked: number,
  scrollContainer: RefObject<HTMLElement>,
) => {
  const dispatch = useDispatch()

  const [scrollEnabled, setScrollEnabled] = useState(true)
  const [direction, setDirection] = useState<"down" | "up">("down")
  const checkedRef = useRef<number>(1)
  checkedRef.current = checked

  const handleScroll = (evt: WheelEvent) => {
    if (!scrollEnabled) return
    const tempChecked = checkedRef.current
    const container = scrollContainer.current
    if (container) {
      match({
        isAtBottom:
          container.scrollTop + container.clientHeight >=
          container.scrollHeight,
        isAtTop: container.scrollTop === 0,
        deltaY: evt.deltaY,
        currentChecked: checkedRef.current,
      })
        .with(
          {
            isAtBottom: true,
            deltaY: P.when((y: number) => y > 0),
            currentChecked: P.when((c: number) => c !== slidesCount),
          },
          () => {
            setDirection("down")
            setScrollEnabled(false)
            dispatch(setCheckBlock(0))
            setTimeout(() => {
              setDirection("up")
              dispatch(setCheckBlock(tempChecked + 1))
              setScrollEnabled(true)
            }, 600)
          },
        )
        .with(
          {
            isAtTop: true,
            deltaY: P.when((y: number) => y < 0),
            currentChecked: P.when((c: number) => c !== 1),
          },
          () => {
            setDirection("up")
            setScrollEnabled(false)
            dispatch(setCheckBlock(0))
            setTimeout(() => {
              setDirection("down")
              dispatch(setCheckBlock(tempChecked - 1))
              setScrollEnabled(true)
            }, 600)
          },
        )
        .otherwise(() => {})
    }
  }

  useEffect(() => {
    const container = scrollContainer.current
    if (container) container.addEventListener("wheel", handleScroll)

    return () => {
      if (container) container.removeEventListener("wheel", handleScroll)
    }
  }, [scrollEnabled, scrollContainer.current])

  useEffect(() => {
    if (!scrollEnabled) {
      const timeout = setTimeout(() => setScrollEnabled(true), 1200)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [scrollEnabled])

  return {
    scrollEnabled,
    setScrollEnabled,
    direction,
    setDirection,
    scrollContainer,
  }
}

export default useScrollSlidesHandler
