"use client"

import { useEffect } from "react"

import { useSubscription } from "@apollo/client"
import { useDispatch } from "react-redux"

import { SubgraphClient } from "@/config/subgraph"
import { TNotification } from "@/store/slices/notificationsSlice/interface"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { BORROWER_REGISTRATION_CHANGE_SUBSCRIPTION } from "@/utils/subscriptions"

const BorrowerRegistrationListener = () => {
  const dispatch = useDispatch()
  const { data, error } = useSubscription(
    BORROWER_REGISTRATION_CHANGE_SUBSCRIPTION,
    {
      client: SubgraphClient,
      variables: {},
    },
  )

  useEffect(() => {
    if (data) {
      const { borrowerRegistrationChange } = data
      const notification: TNotification = {
        description:
          borrowerRegistrationChange.isRegistered === true
            ? "You have been successfully onboarded as a borrower."
            : "You have been removed as a borrower.",
        category: "marketActivity",
        blockTimestamp: 0,
        unread: true,
      }
      dispatch(addNotification(notification))
    }

    /* if (error) {
      console.error(
        "Error subscribing to borrower registration changes:",
        error,
      )
    */
  }, [data, error, dispatch])

  return null
}

export default BorrowerRegistrationListener
