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
  SafeLoginSignature,
  SafeOwnerLoginScope,
  signSafeOwnerLogin,
} from "@/lib/safeOwnerLogin"
import { GenericProviderProps } from "@/providers/interface"

type SignWithSafe = (signal: AbortSignal) => Promise<SafeLoginSignature>

const OwnerLoginContext = createContext<
  | ((
      scope: SafeOwnerLoginScope,
      signWithSafe: SignWithSafe,
    ) => Promise<SafeLoginSignature>)
  | undefined
>(undefined)

type LoginRequest = SafeOwnerLoginScope & {
  controller: AbortController
  resolve: (signature: SafeLoginSignature) => void
  reject: (error: Error) => void
  signWithSafe: SignWithSafe
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
  onSigned: (signature: SafeLoginSignature) => void
}) => {
  const { t } = useTranslation()
  const { connectors, connectAsync, isPending: isConnecting } = useConnect()
  const { connector: connectedOwner } = useAccount()
  const { mutate, isPending, error, variables } = useMutation({
    mutationFn: async (connector: Connector | "safe") => {
      const { signal } = request.controller
      if (connector === "safe") return request.signWithSafe(signal)
      if (connectedOwner?.uid !== connector.uid) {
        let closeModal: (() => void) | undefined
        try {
          if (connector.type === "walletConnect") {
            const provider = (await connector.getProvider()) as {
              modal?: { closeModal: () => void }
            }
            closeModal = () => provider.modal?.closeModal()
            signal.addEventListener("abort", closeModal, { once: true })
          }
          if (signal.aborted) throw new Error(t("auth.login.cancelled"))
          await connectAsync({ connector, chainId: request.chainId })
        } finally {
          if (closeModal) signal.removeEventListener("abort", closeModal)
        }
      }
      if (signal.aborted) throw new Error(t("auth.login.cancelled"))
      return signSafeOwnerLogin(ownerConfig, connector, request, signal)
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
      disableEnforceFocus={
        isConnecting &&
        variables !== "safe" &&
        variables?.type === "walletConnect"
      }
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
          <Button
            variant="outlined"
            disabled={isPending}
            onClick={() => mutate("safe")}
          >
            {t("auth.safeOwner.useSafeApprovals")}
          </Button>
          <Typography variant="text3">
            {t("auth.safeOwner.safeApprovalsDescription")}
          </Typography>
          {isPending && (
            <Typography role="status">
              {variables === "safe"
                ? t("auth.safeOwner.waitingForSafe")
                : t("auth.safeOwner.continueInWallet")}
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
    (scope: SafeOwnerLoginScope, signWithSafe: SignWithSafe) => {
      if (active.current)
        return Promise.reject(new Error(t("auth.login.alreadyInProgress")))
      return new Promise<SafeLoginSignature>((resolve, reject) => {
        const next = {
          ...scope,
          resolve,
          reject,
          signWithSafe,
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
