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
