import { useEffect } from "react"

import { useDispatch } from "react-redux"
import { match } from "ts-pattern"

import { setSidebarHighlightState } from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"

const useSidebarHighlight = (checked: number) => {
  const dispatch = useDispatch()

  useEffect(() => {
    match(checked)
      .with(1, () => {
        dispatch(
          setSidebarHighlightState({
            borrowRepay: true,
            statusDetails: false,
            withdrawals: false,
            lenders: false,
          }),
        )
      })
      .with(2, () => {
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: true,
            withdrawals: false,
            lenders: false,
          }),
        )
      })
      .with(3, () => {
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            withdrawals: true,
            lenders: false,
          }),
        )
      })
      .with(4, () => {
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            withdrawals: false,
            lenders: true,
          }),
        )
      })
      .otherwise(() => {
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            withdrawals: false,
            lenders: false,
          }),
        )
      })
  }, [checked, dispatch])
}

export default useSidebarHighlight
