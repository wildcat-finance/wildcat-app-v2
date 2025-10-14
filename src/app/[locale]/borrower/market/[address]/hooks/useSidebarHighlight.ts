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
            marketSummary: false,
            withdrawals: false,
            lenders: false,
            mla: false,
            marketHistory: false,
          }),
        )
      })
      .with(2, () => {
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: true,
            marketSummary: false,
            withdrawals: false,
            lenders: false,
            mla: false,
            marketHistory: false,
          }),
        )
      })
      .with(3, () => {
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            marketSummary: true,
            withdrawals: false,
            lenders: false,
            mla: false,
            marketHistory: false,
          }),
        )
      })
      .with(4, () => {
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            marketSummary: false,
            withdrawals: true,
            lenders: false,
            mla: false,
            marketHistory: false,
          }),
        )
        break
      case 5:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            marketSummary: false,
            withdrawals: false,
            lenders: true,
            mla: false,
            marketHistory: false,
          }),
        )
        break
      case 6:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            marketSummary: false,
            withdrawals: false,
            lenders: false,
            mla: true,
            marketHistory: false,
          }),
        )
        break
      case 7:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            marketSummary: false,
            withdrawals: false,
            lenders: false,
            mla: false,
            marketHistory: true,
          }),
        )
      })
      .otherwise(() => {
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            marketSummary: false,
            withdrawals: false,
            lenders: false,
            mla: true,
            marketHistory: true,
          }),
        )
      })
  }, [checked, dispatch])
}

export default useSidebarHighlight
