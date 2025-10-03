"use client"

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation } from "@tanstack/react-query"
import { useAccount } from "wagmi"

import { toastRequest } from "@/components/Toasts"
import { getLoginSignatureMessage } from "@/config/api"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setApiToken } from "@/store/slices/apiTokensSlice/apiTokensSlice"
import { ApiToken } from "@/store/slices/apiTokensSlice/interface"
import { dayjs } from "@/utils/dayjs"

import { useEthersSigner } from "./useEthersSigner"

export const useAuthToken = () => {
  const { address } = useAccount()
  const tokenKey = address?.toLowerCase() ?? ""
  const token = useAppSelector((state) => state.apiTokens[tokenKey])
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
            chainId: signer.chainId,
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
