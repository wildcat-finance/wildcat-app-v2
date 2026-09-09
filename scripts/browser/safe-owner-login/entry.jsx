import React from "react"
import { createRoot } from "react-dom/client"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@mui/material"
import { WagmiProvider, useAccount } from "wagmi"
import { connect, getAccount } from "wagmi/actions"
import { ModalCtrl, RouterCtrl } from "@walletconnect/modal-core"
import { config } from "@/lib/config"
import {
  SafeOwnerLoginProvider,
  useSafeOwnerLogin,
} from "@/providers/SafeOwnerLoginProvider"
import { theme } from "@/theme/theme"

const store = configureStore({
  reducer: (state = { selectedNetwork: { chainId: 11155111 } }, action) =>
    action.type === "test/chain"
      ? { selectedNetwork: { chainId: action.payload } }
      : state,
})
const state = { errors: [], signed: [] }
Object.assign(window, {
  safeLoginTest: {
    state,
    connectPrimary: () =>
      connect(config, {
        connector: config.connectors.find((c) => c.id === "safe"),
      }),
    primary: () => getAccount(config).address,
    explorer: () => RouterCtrl.push("WalletExplorer"),
    closeWalletConnect: () => ModalCtrl.close(),
    setChain: (chainId) =>
      store.dispatch({ type: "test/chain", payload: chainId }),
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
          sign({ address: account.address, chainId: 11155111 }).then(
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

createRoot(document.getElementById("root")).render(
  <WagmiProvider config={config} reconnectOnMount={false}>
    <QueryClientProvider client={new QueryClient()}>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <SafeOwnerLoginProvider>
            <Login />
          </SafeOwnerLoginProvider>
        </ThemeProvider>
      </Provider>
    </QueryClientProvider>
  </WagmiProvider>,
)
