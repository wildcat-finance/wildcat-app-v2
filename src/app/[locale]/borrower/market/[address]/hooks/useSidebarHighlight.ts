import { useEffect } from "react"

import { useDispatch } from "react-redux"

import { setSidebarHighlightState } from "@/store/slices/highlightSidebarSlice/highlightSidebarSlice"

const useSidebarHighlight = (checked: number) => {
  const dispatch = useDispatch()

  useEffect(() => {
    switch (checked) {
      case 1:
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
        break
      case 2:
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
        break
      case 3:
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
        break
      case 4:
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
        break
      default:
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
        break
    }
  }, [checked, dispatch])
}

export default useSidebarHighlight
