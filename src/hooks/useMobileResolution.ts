import { useSyncExternalStore } from "react"

import { MOBILE_MAX_WIDTH } from "@/theme/breakpoints"

const MOBILE_QUERY = `(max-width:${MOBILE_MAX_WIDTH}px)`

const subscribers = new Set<() => void>()
let mediaQueryList: MediaQueryList | undefined

const getMediaQueryList = () => {
  mediaQueryList ??= window.matchMedia(MOBILE_QUERY)
  return mediaQueryList
}

const notifySubscribers = () => subscribers.forEach((notify) => notify())

const subscribe = (notify: () => void) => {
  const mql = getMediaQueryList()
  if (subscribers.size === 0) {
    mql.addEventListener("change", notifySubscribers)
  }
  subscribers.add(notify)

  return () => {
    subscribers.delete(notify)
    if (subscribers.size === 0) {
      mql.removeEventListener("change", notifySubscribers)
    }
  }
}

const getSnapshot = () => getMediaQueryList().matches
const getServerSnapshot = () => false

export const useMobileResolution = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
