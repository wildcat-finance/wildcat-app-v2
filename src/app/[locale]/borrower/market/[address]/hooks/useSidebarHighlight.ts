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
            withdrawals: false,
            lenders: false,
            mla: false,
            marketHistory: false,
            collateralContract: false,
          }),
        )
        break
      case 2:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: true,
            withdrawals: false,
            lenders: false,
            mla: false,
            marketHistory: false,
            collateralContract: false,
          }),
        )
        break
      case 3:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            withdrawals: true,
            lenders: false,
            mla: false,
            marketHistory: false,
            collateralContract: false,
          }),
        )
        break
      case 4:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            withdrawals: false,
            lenders: true,
            mla: false,
            marketHistory: false,
            collateralContract: false,
          }),
        )
        break
      case 5:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            withdrawals: false,
            lenders: false,
            mla: true,
            marketHistory: false,
            collateralContract: false,
          }),
        )
        break
      case 6:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            withdrawals: false,
            lenders: false,
            mla: false,
            marketHistory: true,
            collateralContract: false,
          }),
        )
        break
      case 7:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            withdrawals: false,
            lenders: false,
            mla: false,
            marketHistory: false,
            collateralContract: true,
          }),
        )
        break
      default:
        dispatch(
          setSidebarHighlightState({
            borrowRepay: false,
            statusDetails: false,
            withdrawals: false,
            lenders: false,
          }),
        )
        break
    }
  }, [checked, dispatch])
}

export default useSidebarHighlight
