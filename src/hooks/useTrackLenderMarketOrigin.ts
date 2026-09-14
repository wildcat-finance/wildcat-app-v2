"use client"

import { useEffect } from "react"

import { usePathname } from "next/navigation"

import { useAppDispatch } from "@/store/hooks"
import { setLenderMarketOrigin } from "@/store/slices/lenderMarketOriginSlice/lenderMarketOriginSlice"
import {
  lenderMarketOriginOf,
  writeStoredLenderMarketOrigin,
} from "@/utils/lenderMarketOrigin"

/**
 * Records which lender list page the user is on, so the market page's Back
 * control can return there.
 *
 * This watches the router instead of being attached to the market links
 * themselves. There are seven places that build a link into a market — data
 * grid rows, a trending card, mobile cards, mobile search — reached by
 * anchors, by router.push and by window.open, and every one of them would
 * otherwise have to name its own page and keep naming it correctly. Watching
 * the pathname answers the question once, for all of them, including any link
 * added later.
 *
 * Call it from a component that stays mounted across the whole lender area,
 * market page included, or the record is lost on the navigation it exists to
 * describe.
 */
export const useTrackLenderMarketOrigin = () => {
  const dispatch = useAppDispatch()
  const pathname = usePathname()

  useEffect(() => {
    const origin = lenderMarketOriginOf(pathname)
    if (!origin) return

    dispatch(setLenderMarketOrigin(origin))
    // Mirrored so a reload on the market page can recover it; the reader seeds
    // itself from here, because this provider commits too late to be the one
    // that does it.
    writeStoredLenderMarketOrigin(origin)
  }, [dispatch, pathname])
}
