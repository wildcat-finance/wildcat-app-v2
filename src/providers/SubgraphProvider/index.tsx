"use client"

import { createContext, useContext, useMemo } from "react"

import { ApolloClient, NormalizedCacheObject } from "@apollo/client"
import { getSubgraphClient } from "@wildcatfi/wildcat-sdk"

import { NETWORKS } from "@/config/network"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { logger } from "@/lib/logging/client"

export type SubgraphClientType = ApolloClient<NormalizedCacheObject>

const TargetNetworkEnv = process.env.NEXT_PUBLIC_TARGET_NETWORK

const isValidNetwork = (network: string): network is keyof typeof NETWORKS =>
  network in NETWORKS
const defaultNetwork =
  TargetNetworkEnv && isValidNetwork(TargetNetworkEnv)
    ? NETWORKS[TargetNetworkEnv]
    : NETWORKS.Mainnet

const SubgraphContext = createContext<SubgraphClientType>(
  getSubgraphClient(defaultNetwork.chainId),
)

export const SubgraphProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  // Reads target chain from react-redux
  const { chainId } = useSelectedNetwork()
  // Recreates the subgraph client when the target chain changes
  const value = useMemo(() => {
    logger.info({ chainId }, "Recreating subgraph client") // first test
    return getSubgraphClient(chainId)
  }, [chainId])
  return (
    <SubgraphContext.Provider value={value} key={`subgraph-client-${chainId}`}>
      {children}
    </SubgraphContext.Provider>
  )
}

export const useSubgraphClient = () => useContext(SubgraphContext)
