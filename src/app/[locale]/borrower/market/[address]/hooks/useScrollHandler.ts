import { useRef } from "react"

import { useAppSelector } from "@/store/hooks"

import useScrollSlidesHandler from "./useScrollSlidesHandler"
import useSidebarHighlight from "./useSidebarHighlight"

const useScrollHandler = () => {
  const scrollContainer = useRef<HTMLElement>(null)
  const checked = useAppSelector((state) => state.highlightSidebar.checked)
  const slidesCount = 5

  const { scrollEnabled, setScrollEnabled, direction, setDirection } =
    useScrollSlidesHandler(slidesCount, checked, scrollContainer)

  useSidebarHighlight(checked)

  return {
    scrollContainer,
    checked,
    scrollEnabled,
    setScrollEnabled,
    direction,
    setDirection,
  }
}

export default useScrollHandler
