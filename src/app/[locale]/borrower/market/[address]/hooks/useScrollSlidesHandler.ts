import { useState, useEffect, useRef, RefObject } from "react"

import { useDispatch } from "react-redux"

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
      if (
        container.scrollTop + container.clientHeight >=
        container.scrollHeight
      ) {
        if (evt.deltaY > 0 && checkedRef.current !== slidesCount) {
          setDirection("down")
          setScrollEnabled(false)
          dispatch(setCheckBlock(0))
          setTimeout(() => {
            setDirection("up")
            dispatch(setCheckBlock(tempChecked + 1))
            setScrollEnabled(true)
          }, 600)
        }
      }
      if (container.scrollTop === 0) {
        if (evt.deltaY < 0 && checkedRef.current !== 1) {
          setDirection("up")
          setScrollEnabled(false)
          dispatch(setCheckBlock(0))
          setTimeout(() => {
            setDirection("down")
            dispatch(setCheckBlock(tempChecked - 1))
            setScrollEnabled(true)
          }, 600)
        }
      }
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
