import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { isSupportedChainId, SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage"

import { NETWORKS, NETWORKS_BY_ID } from "@/config/network"

const persistConfig = {
  key: "selectedNetwork",
  storage,
}

export type SelectedChainType = {
  chainId: SupportedChainId
  stringID: string
  name: string
  blockExplorerUrl: string
  isTestnet: boolean
  hasV1Deployment: boolean
}

const isValidNetwork = (network: string): network is keyof typeof NETWORKS =>
  network in NETWORKS

const TargetNetworkEnv = process.env.NEXT_PUBLIC_TARGET_NETWORK

const defaultNetwork =
  TargetNetworkEnv && isValidNetwork(TargetNetworkEnv)
    ? NETWORKS[TargetNetworkEnv]
    : NETWORKS.Mainnet

const initialState: SelectedChainType = {
  ...defaultNetwork,
}

const selectedNetworkSlice = createSlice({
  name: "selectedChain",
  initialState,
  reducers: {
    setSelectedNetwork: (state, action: PayloadAction<SupportedChainId>) => {
      if (isSupportedChainId(action.payload)) {
        const network = NETWORKS_BY_ID[action.payload]
        state.chainId = network.chainId
        state.stringID = network.stringID
        state.name = network.name
        state.blockExplorerUrl = network.blockExplorerUrl
        state.isTestnet = network.isTestnet
      }
    },
    resetSelectedNetwork: () => initialState,
  },
})

export const { setSelectedNetwork, resetSelectedNetwork } =
  selectedNetworkSlice.actions

export default persistReducer(persistConfig, selectedNetworkSlice.reducer)
