import React from "react"
import { createRoot } from "react-dom/client"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@mui/material"
import { createInstance } from "i18next"
import { I18nextProvider } from "react-i18next"
import { WagmiProvider, useAccount } from "wagmi"
import { connect, getAccount } from "wagmi/actions"
import { ModalCtrl, RouterCtrl } from "@walletconnect/modal-core"
import { clientConfig } from "@/lib/client-config"
import {
  SafeOwnerLoginProvider,
  useSafeOwnerLogin,
} from "@/providers/SafeOwnerLoginProvider"
import en from "@/locales/en/en.json"
import { theme } from "@/theme/theme"

const store = configureStore({
  reducer: (state = { selectedNetwork: { chainId: 11155111 } }, action) =>
    action.type === "test/chain"
      ? { selectedNetwork: { chainId: action.payload } }
      : state,
})
const state = { errors: [], signed: [], safeRequests: 0 }
let approveSafe
const signWithSafe = (signal) =>
  new Promise((resolve, reject) => {
    state.safeRequests += 1
    signal.addEventListener(
      "abort",
      () => reject(new Error("Login cancelled")),
      { once: true },
    )
    approveSafe = () =>
      resolve({
        signature: "0x",
        timeSigned: 123,
        pendingSafeMessageId: "approved-safe-login",
      })
  })

Object.assign(window, {
  safeLoginTest: {
    state,
    connectPrimary: () =>
      connect(clientConfig, {
        connector: clientConfig.connectors.find((c) => c.id === "safe"),
      }),
    primary: () => getAccount(clientConfig).address,
    explorer: () => RouterCtrl.push("WalletExplorer"),
    closeWalletConnect: () => ModalCtrl.close(),
    setChain: (chainId) =>
      store.dispatch({ type: "test/chain", payload: chainId }),
    approveSafe: () => approveSafe(),
  },
})

function Login() {
  const account = useAccount()
  const sign = useSafeOwnerLogin()
  return (
    <>
      <p id="primary">
        {account.address} · {account.connector?.id}
      </p>
      <button
        id="login"
        onClick={() =>
          sign(
            { address: account.address, chainId: 11155111 },
            signWithSafe,
          ).then(
            (signature) => state.signed.push(signature),
            (error) => state.errors.push(error.message),
          )
        }
      >
        Login
      </button>
    </>
  )
}

async function main() {
  const i18n = createInstance()
  await i18n.init({ lng: "en", resources: { en: { translation: en } } })
  createRoot(document.getElementById("root")).render(
    <WagmiProvider config={clientConfig} reconnectOnMount={false}>
      <QueryClientProvider client={new QueryClient()}>
        <Provider store={store}>
          <I18nextProvider i18n={i18n}>
            <ThemeProvider theme={theme}>
              <SafeOwnerLoginProvider>
                <Login />
              </SafeOwnerLoginProvider>
            </ThemeProvider>
          </I18nextProvider>
        </Provider>
      </QueryClientProvider>
    </WagmiProvider>,
  )
}
main().catch((error) => {
  throw error
})
