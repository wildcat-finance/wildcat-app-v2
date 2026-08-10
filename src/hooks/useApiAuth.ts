"use client"

import { useEffect } from "react"

import { useIsMutating, useMutation, useQuery } from "@tanstack/react-query"
import { decode as decodeJWT } from "jsonwebtoken"
import { useAccount } from "wagmi"

import { toastError, toastRequest } from "@/components/Toasts"
import {
  getLoginSignatureMessage,
  LOGIN_SIGNATURE_MAX_AGE_SECONDS,
} from "@/config/api"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  getApiTokenKey,
  setApiToken,
  removeApiToken,
} from "@/store/slices/apiTokensSlice/apiTokensSlice"
import { ApiToken } from "@/store/slices/apiTokensSlice/interface"
import { dayjs } from "@/utils/dayjs"

import { useEthersSigner } from "./useEthersSigner"
import { useSafeMessageSigning } from "./useSafeMessageSigning"
import { useSelectedNetwork } from "./useSelectedNetwork"

export const useRefreshApiToken = (chainIdOverride?: number) => {
  const { address } = useAccount()
  const selectedNetwork = useSelectedNetwork()
  const chainId = chainIdOverride ?? selectedNetwork.chainId
  const dispatch = useAppDispatch()
  const tokenKey = address ? getApiTokenKey(address, chainId) : ""
  const token = useAppSelector((state) => state.apiTokens[tokenKey])

  return useMutation({
    mutationKey: ["refreshApiToken", tokenKey],
    mutationFn: async () => {
      if (!token) throw Error(`No API token`)
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

export const useRemoveBadApiToken = (chainIdOverride?: number) => {
  const dispatch = useAppDispatch()
  const { address } = useAccount()
  const selectedNetwork = useSelectedNetwork()
  const chainId = chainIdOverride ?? selectedNetwork.chainId
  const tokenKey = address ? getApiTokenKey(address, chainId) : ""
  return useMutation({
    mutationKey: ["removeBadApiToken", tokenKey],
    mutationFn: async () => {
      dispatch(removeApiToken(tokenKey))
      toastError(`Session expired`)
    },
  })
}

export const useAuthToken = (chainIdOverride?: number) => {
  const { address } = useAccount()
  const selectedNetwork = useSelectedNetwork()
  const chainId = chainIdOverride ?? selectedNetwork.chainId
  const tokenKey = address ? getApiTokenKey(address, chainId) : ""
  const token = useAppSelector((state) => state.apiTokens[tokenKey])
  const { mutate: refreshToken, isPending: isRefreshing } =
    useRefreshApiToken(chainId)
  const { mutate: removeBadToken, isPending: isRemovingBadToken } =
    useRemoveBadApiToken(chainId)
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
  const selectedNetwork = useSelectedNetwork()
  const signer = useEthersSigner()
  const safeSigning = useSafeMessageSigning()

  return useMutation({
    mutationFn: async (address: string) => {
      if (!signer) throw Error(`No signer`)
      if (!address) throw Error(`No address`)
      if (signer.chainId !== selectedNetwork.chainId) {
        throw Error(`Wallet network does not match selected network`)
      }
      address = address.toLowerCase()
      // Login timestamps are unix SECONDS (the server's freshness check and
      // the signed message both use them); the pending-message machinery
      // treats the value as opaque and hands it back on resume.
      const timeSigned = dayjs().unix()
      const signPromise = safeSigning
        .signMessage({
          flow: "login",
          address,
          chainId: selectedNetwork.chainId,
          timeSigned,
          // The server rejects login messages older than an hour, so a
          // pending Safe login proposal is worthless past that - expire it
          // instead of submitting a guaranteed rejection.
          expiresAt: (timeSigned + LOGIN_SIGNATURE_MAX_AGE_SECONDS) * 1000,
          buildMessage: (effectiveTimeSigned) =>
            getLoginSignatureMessage(
              address,
              effectiveTimeSigned,
              selectedNetwork.chainId,
            ),
        })
        .then((result) => {
          // Outside a Safe app context "0x" means the wallet gave us nothing.
          // Inside one, "0x" is a real answer: an on-chain-registered Safe
          // message the server verifies against the Safe's signed-message
          // registry.
          if (!safeSigning.safeConnected && result.signature === "0x") {
            throw Error(`Wallet did not return a login signature`)
          }
          return result
        })
      // When connected to a Safe the coordinator owns progress toasts
      // ("Awaiting Safe confirmations for login...").
      const signed = safeSigning.safeConnected
        ? await signPromise
        : await toastRequest(signPromise, {
            pending: `Signing login message...`,
            success: `Signed login message!`,
            error: `Failed to sign login message!`,
          })

      safeSigning.markSubmitting(signed.pendingSafeMessageId)
      const submitLogin = async () => {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            signature: signed.signature,
            timeSigned: signed.timeSigned,
            address,
            chainId: selectedNetwork.chainId,
          }),
        })
        if (response.status !== 200) {
          throw Error(`Failed to log in! ${response.statusText}`)
        }
        const token = (await response.json()) as ApiToken
        if (token.chainId !== selectedNetwork.chainId) {
          throw Error(`Login returned token for wrong chain`)
        }
        return token
      }

      try {
        const token = await toastRequest(submitLogin(), {
          pending: `Submitting login...`,
          success: `Logged in!`,
          error: `Failed to log in!`,
        })
        safeSigning.markCompleted(signed.pendingSafeMessageId)
        return token
      } catch (error) {
        safeSigning.markSubmissionFailed(signed.pendingSafeMessageId, error)
        throw error
      }
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
