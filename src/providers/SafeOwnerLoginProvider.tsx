"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAccount, useConnect, WagmiProvider } from "wagmi"
import type { Config, Connector } from "wagmi"

import { NETWORKS_BY_ID } from "@/config/network"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getOwnerWalletConfig } from "@/lib/ownerWalletConfig"
import {
  OwnerLoginSignature,
  SafeOwnerLoginScope,
  signSafeOwnerLogin,
} from "@/lib/safeOwnerLogin"
import { GenericProviderProps } from "@/providers/interface"

const OwnerLoginContext = createContext<
  ((scope: SafeOwnerLoginScope) => Promise<OwnerLoginSignature>) | undefined
>(undefined)

type LoginRequest = SafeOwnerLoginScope & {
  controller: AbortController
  resolve: (signature: OwnerLoginSignature) => void
  reject: (error: Error) => void
}

const OwnerWalletDialog = ({
  request,
  ownerConfig,
  onCancel,
  onSigned,
}: {
  request: LoginRequest
  ownerConfig: Config
  onCancel: () => void
  onSigned: (signature: OwnerLoginSignature) => void
}) => {
  const { t } = useTranslation()
  const { connectors, connectAsync } = useConnect()
  const { connector: connectedOwner } = useAccount()
  const { mutate, isPending, error } = useMutation({
    mutationFn: async (connector: Connector) => {
      if (connectedOwner?.uid !== connector.uid) {
        await connectAsync({ connector, chainId: request.chainId })
      }
      if (request.controller.signal.aborted)
        throw new Error(t("auth.login.cancelled"))
      return signSafeOwnerLogin(
        ownerConfig,
        connector,
        request,
        request.controller.signal,
      )
    },
    onSuccess: onSigned,
  })
  const wallets = connectors.filter(
    (connector) =>
      connector.id !== "injected" ||
      !connectors.some(
        (other) => other.type === "injected" && other.id !== "injected",
      ),
  )
  const network = Object.values(NETWORKS_BY_ID).find(
    ({ chainId }) => chainId === request.chainId,
  )

  return (
    <Dialog
      open
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      aria-labelledby="safe-owner-login-title"
    >
      <DialogTitle id="safe-owner-login-title">
        {t("auth.safeOwner.title")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="text2">
            {t("auth.safeOwner.description")}
          </Typography>
          <Typography variant="text3" sx={{ overflowWrap: "anywhere" }}>
            {request.address} · {network?.name}
          </Typography>
          <Typography variant="text3">
            {t("auth.safeOwner.approvalScope")}
          </Typography>
          {wallets.map((connector) => (
            <Button
              key={connector.uid}
              variant="outlined"
              disabled={isPending}
              onClick={() => mutate(connector)}
            >
              {connector.name === "Injected"
                ? t("auth.safeOwner.browserWallet")
                : connector.name}
            </Button>
          ))}
          {isPending && (
            <Typography role="status">
              {t("auth.safeOwner.continueInWallet")}
            </Typography>
          )}
          {error && <Alert severity="error">{error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t("common.buttons.cancel")}</Button>
      </DialogActions>
    </Dialog>
  )
}

export const SafeOwnerLoginProvider = ({ children }: GenericProviderProps) => {
  const { t } = useTranslation()
  const { address, chainId: walletChainId } = useAccount()
  const { chainId } = useSelectedNetwork()
  const [request, setRequest] = useState<LoginRequest | null>(null)
  const active = useRef<LoginRequest | null>(null)

  const cancel = useCallback(() => {
    active.current?.controller.abort()
    active.current?.reject(new Error(t("auth.login.cancelled")))
    active.current = null
    setRequest(null)
  }, [t])

  const signAsOwner = useCallback(
    (scope: SafeOwnerLoginScope) => {
      if (active.current)
        return Promise.reject(new Error(t("auth.login.alreadyInProgress")))
      return new Promise<OwnerLoginSignature>((resolve, reject) => {
        const next = {
          ...scope,
          resolve,
          reject,
          controller: new AbortController(),
        }
        active.current = next
        setRequest(next)
      })
    },
    [t],
  )

  useEffect(() => {
    if (
      request &&
      (address?.toLowerCase() !== request.address.toLowerCase() ||
        chainId !== request.chainId ||
        walletChainId !== request.chainId)
    )
      cancel()
  }, [address, chainId, walletChainId, request, cancel])

  useEffect(
    () => () => {
      active.current?.controller.abort()
      active.current?.reject(new Error(t("auth.login.cancelled")))
      active.current = null
    },
    [t],
  )

  return (
    <OwnerLoginContext.Provider value={signAsOwner}>
      {children}
      {request && (
        <WagmiProvider config={getOwnerWalletConfig()} reconnectOnMount={false}>
          <OwnerWalletDialog
            request={request}
            ownerConfig={getOwnerWalletConfig()}
            onCancel={cancel}
            onSigned={(signature) => {
              // A dismissed wallet prompt can still finish after another login.
              if (active.current !== request) return
              request.resolve(signature)
              active.current = null
              setRequest(null)
            }}
          />
        </WagmiProvider>
      )}
    </OwnerLoginContext.Provider>
  )
}

export const useSafeOwnerLogin = () => {
  const signAsOwner = useContext(OwnerLoginContext)
  if (!signAsOwner) throw new Error("SafeOwnerLoginProvider is missing")
  return signAsOwner
}
