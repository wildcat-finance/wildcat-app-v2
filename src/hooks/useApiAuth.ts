"use client"

import { useEffect } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useIsMutating, useMutation } from "@tanstack/react-query"
import { decode as decodeJWT } from "jsonwebtoken"
import { useAccount } from "wagmi"
import { getAccount } from "wagmi/actions"

import { toastError, toastRequest } from "@/components/Toasts"
import { getLoginSignatureMessage } from "@/config/api"
import { config } from "@/lib/config"
import { useSafeOwnerLogin } from "@/providers/SafeOwnerLoginProvider"
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks"
import {
  getApiTokenKey,
  setApiToken,
  removeApiToken,
} from "@/store/slices/apiTokensSlice/apiTokensSlice"
import { ApiToken } from "@/store/slices/apiTokensSlice/interface"
import { dayjs } from "@/utils/dayjs"

import { useEthersSigner } from "./useEthersSigner"
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
  const store = useAppStore()
  const { chainId } = useSelectedNetwork()
  const signer = useEthersSigner()
  const { connected: safeConnected, safe } = useSafeAppsSDK()
  const signAsOwner = useSafeOwnerLogin()
  const isLoggingIn = useIsMutating({ mutationKey: ["login"] })

  const mutation = useMutation({
    mutationKey: ["login"],
    mutationFn: async (address: string) => {
      if (!address) throw Error("No login account selected")
      address = address.toLowerCase()
      const requireCurrentAccount = () => {
        const account = getAccount(config)
        if (account.address?.toLowerCase() !== address) {
          throw Error("The connected account changed. Start login again")
        }
        if (
          account.chainId !== chainId ||
          store.getState().selectedNetwork.chainId !== chainId
        ) {
          throw Error("Select the connected wallet's network before logging in")
        }
      }
      requireCurrentAccount()
      if (
        safeConnected &&
        (safe.safeAddress.toLowerCase() !== address || safe.chainId !== chainId)
      ) {
        throw Error("The connected Safe does not match the login account")
      }
      if (getAccount(config).connector?.id === "safe" && !safeConnected) {
        throw Error("The Safe connection is not ready. Please try again")
      }

      let signed
      if (safeConnected) {
        signed = await signAsOwner({ address, chainId })
      } else {
        if (!signer) throw Error("Connect your wallet before logging in")
        if (signer.chainId !== chainId) {
          throw Error("Wallet network does not match selected network")
        }
        const timeSigned = dayjs().unix()
        const signature = await toastRequest(
          signer.signMessage(
            getLoginSignatureMessage(address, timeSigned, chainId),
          ),
          {
            pending: "Sign the login message in your wallet…",
            success: "Login message signed",
            error: "Login signature failed",
          },
        )
        if (signature === "0x")
          throw Error("Wallet did not return a login signature")
        signed = { signature, timeSigned }
      }
      requireCurrentAccount()
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...signed, address, chainId }),
      })
      if (!response.ok) {
        const result = await response.json()
        throw Error(result.error || "Failed to log in")
      }
      const token = (await response.json()) as ApiToken
      if (
        token.chainId !== chainId ||
        token.address.toLowerCase() !== address
      ) {
        throw Error("Login returned a session for the wrong account or network")
      }
      requireCurrentAccount()
      return token
    },
    onSuccess: (token) => dispatch(setApiToken(token)),
    onError: (error) => toastError(error.message),
  })
  return { ...mutation, isPending: mutation.isPending || isLoggingIn > 0 }
}
