"use client"

import { createContext, useContext, useMemo } from "react"

import { ApolloClient, NormalizedCacheObject } from "@apollo/client"

import { NETWORKS } from "@/config/network"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { getBrowserSubgraphClient } from "@/lib/subgraph/client"

export type SubgraphClientType = ApolloClient<NormalizedCacheObject>

const TargetNetworkEnv = process.env.NEXT_PUBLIC_TARGET_NETWORK

const isValidNetwork = (network: string): network is keyof typeof NETWORKS =>
  network in NETWORKS
const defaultNetwork =
  TargetNetworkEnv && isValidNetwork(TargetNetworkEnv)
    ? NETWORKS[TargetNetworkEnv]
    : NETWORKS.Mainnet

const SubgraphContext = createContext<SubgraphClientType>(
  getBrowserSubgraphClient(defaultNetwork.chainId),
)

export const SubgraphProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  // Reads target chain from react-redux
  const { chainId } = useSelectedNetwork()
  // Recreates the subgraph client when the target chain changes
  const value = useMemo(() => getBrowserSubgraphClient(chainId), [chainId])
  return (
    <SubgraphContext.Provider value={value} key={`subgraph-client-${chainId}`}>
      {children}
    </SubgraphContext.Provider>
  )
}

export const useSubgraphClient = () => useContext(SubgraphContext)
