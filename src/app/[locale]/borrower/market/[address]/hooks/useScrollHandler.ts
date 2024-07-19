import { useRef } from "react"

import { useAppSelector } from "@/store/hooks"

import useScrollSlidesHandler from "./useScrollSlidesHandler"
import useSidebarHighlight from "./useSidebarHighlight"

const useScrollHandler = () => {
  const scrollContainer = useRef<HTMLElement>(null)
  const checked = useAppSelector((state) => state.highlightSidebar.checked)
  const slidesCount = 4

  const { scrollEnabled, setScrollEnabled, direction, setDirection } =
    useScrollSlidesHandler(slidesCount, checked)

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
