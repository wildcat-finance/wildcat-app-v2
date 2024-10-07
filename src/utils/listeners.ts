"use client"

import React, { useEffect } from "react";
import { useSubscription } from "@apollo/client";
import { useDispatch } from "react-redux";
import { SubgraphClient } from "@/config/subgraph";
import { BORROWER_REGISTRATION_CHANGE_SUBSCRIPTION } from "@/utils/subscriptions";
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { TNotification } from "@/store/slices/notificationsSlice/interface"

const formatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const BorrowerRegistrationListener = () => {
  const dispatch = useDispatch();
  const { data, error } = useSubscription(BORROWER_REGISTRATION_CHANGE_SUBSCRIPTION, {
    client: SubgraphClient,
    variables: {
      
    }
  })

  useEffect(() => {
    if (data) {
      const { borrowerRegistrationChange } = data;
      const notification: TNotification = {
        description: `Borrower registration change for ID: ${borrowerRegistrationChange.id}`,
        type: borrowerRegistrationChange.status === "SUCCESS" ? "onboardSuccesful" : "onboardFailed",
        category: "marketActivity",
        date: formatter.format(Date.now()),
        unread: true,
        error: borrowerRegistrationChange.status !== "SUCCESS",
      };
      dispatch(addNotification(notification))
    }

    if (error) {
      console.error("Error subscribing to borrower registration changes:", error)
    }
  }, [data, error, dispatch])

  return null
};

export default BorrowerRegistrationListener