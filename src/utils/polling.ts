"use client"

import { useEffect } from "react";
import { useLazyQuery } from "@apollo/client";
import { useDispatch } from "react-redux";
import { gql } from "@apollo/client";
import { SubgraphClient } from "@/config/subgraph";
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import { TNotification } from "@/store/slices/notificationsSlice/interface"

const formatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const BORROWER_REGISTRATION_CHANGE_QUERY = gql`
  query BorrowerRegistrationChanges($where: BorrowerRegistrationChange_filter) {
    borrowerRegistrationChanges(where: $where) {
      blockTimestamp
      isRegistered
    }
  }
`

const POLLING_INTERVAL = 10000

const PollingBorrowerRegistration = ({ address }) => {
  //address = "0x6c0a11edca6ccb1b26473c715e3a6d0ba9a0efd9" // Testing
  const dispatch = useDispatch();
  const [fetchChanges, { data, error }] = useLazyQuery(BORROWER_REGISTRATION_CHANGE_QUERY, {
    client: SubgraphClient,
    nextFetchPolicy: "network-only",
  })

  const fetch = () => {
    fetchChanges({
      variables: {
        where: {
          registration_: {
            borrower: address,
          },
        },
      },
    })
  }

  useEffect(() => {
    let pollingTimer: NodeJS.Timeout

    const startPolling = () => {
      pollingTimer = setInterval(() => {
        fetch()
      }, POLLING_INTERVAL)
    }

    fetch()

    startPolling()

    return () => {
      if (pollingTimer) clearInterval(pollingTimer);
    }
  }, [fetchChanges, address])

  useEffect(() => {
    if (data) {
      console.dir(data)
      data.borrowerRegistrationChanges.forEach((change: any) => {
        const notification: TNotification = {
          description: change.isRegistered === true ?
            "You have been successfully onboarded as a borrower." :
            "You have been removed as a borrower.",
          type: "borrowerRegistrationChange",
          category: "marketActivity",
          date: formatter.format(Date.now()),
          unread: true,
        };
        dispatch(addNotification(notification))
      })
    }

    if (error) {
      console.error("Error fetching borrower registration changes:", error)
    }
  }, [data, error, dispatch, address])

  return null
};

export default PollingBorrowerRegistration