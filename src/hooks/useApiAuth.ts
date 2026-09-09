"use client"

import { useEffect } from "react"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useIsMutating, useMutation } from "@tanstack/react-query"
import { decode as decodeJWT } from "jsonwebtoken"
import { useTranslation } from "react-i18next"
import { useAccount, useConfig } from "wagmi"
import { getAccount } from "wagmi/actions"

import { toastError, toastRequest } from "@/components/Toasts"
import { getLoginSignatureMessage } from "@/config/api"
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
  const { t } = useTranslation()
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
        toastError(t("auth.sessionExpired"))
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
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { address } = useAccount()
  const selectedNetwork = useSelectedNetwork()
  const chainId = chainIdOverride ?? selectedNetwork.chainId
  const tokenKey = address ? getApiTokenKey(address, chainId) : ""
  return useMutation({
    mutationKey: ["removeBadApiToken", tokenKey],
    mutationFn: async () => {
      dispatch(removeApiToken(tokenKey))
      toastError(t("auth.sessionExpired"))
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
  const { t } = useTranslation()
  const config = useConfig()
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
      if (!address) throw Error(t("auth.login.noAccount"))
      address = address.toLowerCase()
      const requireCurrentAccount = () => {
        const account = getAccount(config)
        if (account.address?.toLowerCase() !== address) {
          throw Error(t("auth.login.accountChanged"))
        }
        if (
          account.chainId !== chainId ||
          store.getState().selectedNetwork.chainId !== chainId
        ) {
          throw Error(t("auth.login.selectWalletNetwork"))
        }
      }
      requireCurrentAccount()
      if (
        safeConnected &&
        (safe.safeAddress.toLowerCase() !== address || safe.chainId !== chainId)
      ) {
        throw Error(t("auth.login.safeMismatch"))
      }
      if (getAccount(config).connector?.id === "safe" && !safeConnected) {
        throw Error(t("auth.login.safeNotReady"))
      }

      let signed
      if (safeConnected) {
        signed = await signAsOwner({ address, chainId })
      } else {
        if (!signer) throw Error(t("auth.login.connectWallet"))
        if (signer.chainId !== chainId) {
          throw Error(t("auth.login.wrongNetwork"))
        }
        const timeSigned = dayjs().unix()
        const signature = await toastRequest(
          signer.signMessage(
            getLoginSignatureMessage(address, timeSigned, chainId),
          ),
          {
            pending: t("auth.login.signPrompt"),
            success: t("auth.login.signed"),
            error: t("auth.login.signatureFailed"),
          },
        )
        if (signature === "0x") throw Error(t("auth.login.emptySignature"))
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
        throw Error(result.error || t("auth.login.failed"))
      }
      const token = (await response.json()) as ApiToken
      if (
        token.chainId !== chainId ||
        token.address.toLowerCase() !== address
      ) {
        throw Error(t("auth.login.wrongSession"))
      }
      requireCurrentAccount()
      return token
    },
    onSuccess: (token) => dispatch(setApiToken(token)),
    onError: (error) => toastError(error.message),
  })
  return { ...mutation, isPending: mutation.isPending || isLoggingIn > 0 }
}
