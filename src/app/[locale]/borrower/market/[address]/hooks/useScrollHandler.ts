import { useState, useEffect, useRef } from "react"

import { useDispatch } from "react-redux"

import { setCheckBlock } from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"

const useScrollHandler = (slidesCount: number, checked: number) => {
  const dispatch = useDispatch()

  const [scrollEnabled, setScrollEnabled] = useState(true)
  const [direction, setDirection] = useState<"down" | "up">("down")
  const checkedRef = useRef<number>(1)
  checkedRef.current = checked

  const handleScroll = (evt: WheelEvent) => {
    if (!scrollEnabled) return
    const tempChecked = checkedRef.current
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight) {
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

    if (window.scrollY === 0) {
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

  useEffect(() => {
    document.onwheel = handleScroll
    return () => {
      document.onwheel = null
    }
  }, [scrollEnabled])

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
  }
}

export default useScrollHandler
