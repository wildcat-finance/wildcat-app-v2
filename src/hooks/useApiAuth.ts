"use client"

import { useEffect } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useIsMutating, useMutation, useQuery } from "@tanstack/react-query"
import { decode as decodeJWT } from "jsonwebtoken"
import { useAccount } from "wagmi"

import { toastError, toastRequest } from "@/components/Toasts"
import { getLoginSignatureMessage } from "@/config/api"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setApiToken,
  removeApiToken,
} from "@/store/slices/apiTokensSlice/apiTokensSlice"
import { ApiToken } from "@/store/slices/apiTokensSlice/interface"
import { dayjs } from "@/utils/dayjs"

import { useEthersSigner } from "./useEthersSigner"

export const useRefreshApiToken = () => {
  const { address } = useAccount()
  const dispatch = useAppDispatch()
  const tokenKey = address?.toLowerCase() ?? ""
  const token = useAppSelector((state) => state.apiTokens[tokenKey])

  return useMutation({
    mutationKey: ["refreshApiToken", tokenKey],
    mutationFn: async () => {
      console.log(`Refreshing token (mutate)`)
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      })
      if (response.status === 401) {
        toastError(`Session expired`)
        throw Error(`Failed to refresh token! Invalid Credentials`)
      } else if (response.status !== 200) {
        throw Error(`Failed to refresh token! ${response.statusText}`)
      }
      const newToken = (await response.json()) as ApiToken
      return newToken
    },
    onSuccess: (newToken: ApiToken) => {
      console.log(`Token refreshed`)
      dispatch(setApiToken(newToken))
    },
    onError(error) {
      console.log(`Error refreshing token`)
      dispatch(removeApiToken(tokenKey))
    },
  })
}

export const useRemoveBadApiToken = () => {
  const dispatch = useAppDispatch()
  const { address } = useAccount()
  const tokenKey = address?.toLowerCase() ?? ""
  return useMutation({
    mutationKey: ["removeBadApiToken", tokenKey],
    mutationFn: async () => {
      dispatch(removeApiToken(tokenKey))
      toastError(`Session expired`)
    },
  })
}

export const useAuthToken = () => {
  const { address } = useAccount()
  const tokenKey = address?.toLowerCase() ?? ""
  const token = useAppSelector((state) => state.apiTokens[tokenKey])
  const { mutate: refreshToken, isPending: isRefreshing } = useRefreshApiToken()
  const { mutate: removeBadToken, isPending: isRemovingBadToken } =
    useRemoveBadApiToken()
  const isRefreshingAnywhere = useIsMutating({
    mutationKey: ["refreshApiToken", tokenKey],
  })
  const jwt = token?.token

  useEffect(() => {
    if (jwt && !isRefreshing && !isRefreshingAnywhere) {
      console.log(`Checking token age`)
      const decoded = decodeJWT(jwt, { json: true })
      if (decoded) {
        const now = dayjs().unix()
        const age = now - (decoded.iat ?? 0)
        const isExpired = (decoded.exp ?? 0) < now
        const isTooFarAhead = (decoded.iat ?? 0) > now + 86_400 * 365
        if (isExpired || isTooFarAhead) {
          console.log(
            `Removing bad token: ${isExpired ? "expired" : "too far ahead"}`,
          )
          removeBadToken()
        } else if (age > 3_600) {
          console.log(`Refreshing token`)
          refreshToken()
        }
      }
    }
  }, [
    jwt,
    refreshToken,
    isRefreshing,
    isRefreshingAnywhere,
    removeBadToken,
    isRemovingBadToken,
  ])

  return token
}

export const useLogin = () => {
  const dispatch = useAppDispatch()

  const { sdk, connected: safeConnected } = useSafeAppsSDK()
  const signer = useEthersSigner()

  return useMutation({
    mutationFn: async (address: string) => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      address = address.toLowerCase()
      const timeSigned = dayjs().unix()

      const sign = async () => {
        const LoginMessage = getLoginSignatureMessage(address, timeSigned)

        if (sdk && safeConnected) {
          console.log(
            `Set safe settings: ${await sdk.eth.setSafeSettings([
              {
                offChainSigning: true,
              },
            ])}`,
          )

          const result = await sdk.txs.signMessage(LoginMessage)

          if ("safeTxHash" in result) {
            return {
              signature: undefined,
              safeTxHash: result.safeTxHash,
            }
          }
          if ("signature" in result) {
            return {
              signature: result.signature as string,
              safeTxHash: undefined,
            }
          }
        }
        console.log(`Signing message with EOA`)
        const signatureResult = await signer.signMessage(LoginMessage)
        return { signature: signatureResult }
      }
      let result: { signature?: string; safeTxHash?: string } = {}
      await toastRequest(
        sign().then((res) => {
          result = res
        }),
        {
          pending: `Signing login message...`,
          success: `Signed login message!`,
          error: `Failed to sign login message!`,
        },
      )
      const submitLogin = async () => {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            signature: result.signature ?? "0x",
            timeSigned,
            address,
          }),
        })
        if (response.status !== 200)
          throw Error(`Failed to log in! ${response.statusText}`)
        return (await response.json()) as ApiToken
      }

      const token = await toastRequest(submitLogin(), {
        pending: `Submitting login...`,
        success: `Logged in!`,
        error: `Failed to log in!`,
      })
      return token
    },
    onSuccess: (token) => {
      if (token) {
        dispatch(setApiToken(token))
        console.log(`Login successful`)
      } else {
        throw Error(`Login failed`)
      }
    },
    onError(error) {
      console.log(error)
    },
  })
}
