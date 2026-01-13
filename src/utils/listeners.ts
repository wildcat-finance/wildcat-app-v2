"use client"

import { useEffect } from "react"

import { useSubscription } from "@apollo/client"
import { useDispatch } from "react-redux"

import { logger } from "@/lib/logging/client"
import { useSubgraphClient } from "@/providers/SubgraphProvider"
import { TNotification } from "@/store/slices/notificationsSlice/interface"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { BORROWER_REGISTRATION_CHANGE_SUBSCRIPTION } from "@/utils/subscriptions"

const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const BorrowerRegistrationListener = () => {
  const dispatch = useDispatch()
  const subgraphClient = useSubgraphClient()
  const { data, error } = useSubscription(
    BORROWER_REGISTRATION_CHANGE_SUBSCRIPTION,
    {
      client: subgraphClient,
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

    if (error) {
      logger.error(
        { err: error },
        "Error subscribing to borrower registration changes",
      )
    }
  }, [data, error, dispatch])

  return null
}

export default BorrowerRegistrationListener
