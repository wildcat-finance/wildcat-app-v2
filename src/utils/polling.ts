"use client"

import { useEffect, createElement } from "react"

import { useLazyQuery, gql, LazyQueryHookOptions } from "@apollo/client"
import { useDispatch } from "react-redux"

import { SubgraphClient } from "@/config/subgraph"
import { TNotification } from "@/store/slices/notificationsSlice/interface"
import { addNotification } from "@/store/slices/notificationsSlice/notificationsSlice"
import {
  formatBps,
  formatSecsToHours,
  MARKET_PARAMS_DECIMALS,
  toTokenAmountProps,
  trimAddress,
} from "@/utils/formatters"

const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const POLLING_INTERVAL = 10000

const options: LazyQueryHookOptions = {
  client: SubgraphClient,
  nextFetchPolicy: "network-only",
}

const PollingRegistration = ({ address }: { address: string | undefined }) => {
  address = "0x6c0a11edca6ccb1b26473c715e3a6d0ba9a0efd9" // Testing
  const dispatch = useDispatch()

  const [fetchBorrowerRegistrationChanges, { data: borrowerData, error }] =
    useLazyQuery(
      gql`
        query BorrowerRegistrationChanges(
          $where: BorrowerRegistrationChange_filter
        ) {
          borrowerRegistrationChanges(where: $where) {
            blockTimestamp
            isRegistered
          }
        }
      `,
      options,
    )

  const [
    fetchAprDecreaseEnded,
    { data: aprDecreaseEndedData, error: aprError },
  ] = useLazyQuery(
    gql`
      query GetMarketsFromBorrowerAddr($where: Market_filter) {
        markets(where: $where) {
          reserveRatioBipsUpdatedRecords {
            newReserveRatioBips
            oldReserveRatioBips
            transactionHash
            blockTimestamp
            blockNumber
            id
          }
          id
          name
          asset {
            symbol
          }
        }
      }
    `,
    options,
  )

  const fetch = () => {
    if (address) {
      fetchBorrowerRegistrationChanges({
        variables: {
          where: {
            registration_: {
              borrower: address,
            },
          },
        },
      })

      fetchAprDecreaseEnded({
        variables: {
          where: {
            borrower: "0x1717503ee3f56e644cf8b1058e3f83f03a71b2e1",
          },
        },
      })
    }
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
      if (pollingTimer) clearInterval(pollingTimer)
    }
  }, [address])

  useEffect(() => {
    if (borrowerData) {
      borrowerData.borrowerRegistrationChanges.forEach(
        (change: { blockTimestamp: string; isRegistered: boolean }) => {
          const notification: TNotification = {
            description:
              change.isRegistered === true
                ? "You have been successfully onboarded as a borrower."
                : "You have been removed as a borrower.",
            type: "borrowerRegistrationChange",
            category: "marketActivity",
            date: formatter.format(
              new Date(parseInt(change.blockTimestamp, 10)),
            ),
            unread: true,
          }
          dispatch(addNotification(notification))
        },
      )
    }

    if (error) {
      console.error("Error fetching borrower registration changes:", error)
    }
  }, [borrowerData, error, dispatch, address])

  useEffect(() => {
    if (aprDecreaseEndedData) {
      console.dir(aprDecreaseEndedData.markets)
      aprDecreaseEndedData.markets.forEach(
        (market: {
          reserveRatioBipsUpdatedRecords: {
            blockTimestamp: string
            oldReserveRatioBips: number
            newReserveRatioBips: number
          }[]
          name: string
          asset: { symbol: string }
        }) => {
          market.reserveRatioBipsUpdatedRecords.forEach(
            (change: {
              blockTimestamp: string
              oldReserveRatioBips: number
              newReserveRatioBips: number
            }) => {
              const notification: TNotification = {
                description: createElement("fragment", null, [
                  "The APR decrease related min reserve change has ended for ",
                  createElement("strong", null, market.name),
                  ".",
                ]),
                type: "aprDecreaseEnded",
                category: "marketActivity",
                date: formatter.format(
                  new Date(parseInt(change.blockTimestamp, 10)),
                ),
                unread: true,
                data: {
                  // oldReserveRatioBips, newReserveRatioBips formatted as apr, newApr
                  apr: `${formatBps(
                    change.oldReserveRatioBips,
                    MARKET_PARAMS_DECIMALS.reserveRatioBips,
                  )} ${market.asset.symbol}`,
                  newApr: `${formatBps(
                    change.newReserveRatioBips,
                    MARKET_PARAMS_DECIMALS.reserveRatioBips,
                  )} ${market.asset.symbol}`,
                  percentageIncrease:
                    (100 *
                      (change.newReserveRatioBips -
                        change.oldReserveRatioBips)) /
                    change.oldReserveRatioBips,
                },
              }
              dispatch(addNotification(notification))
            },
          )
        },
      )
    }

    if (aprError) {
      console.error("Error fetching APR changes:", aprError)
    }
  }, [aprDecreaseEndedData, aprError, dispatch])

  return null
}

export default PollingRegistration
