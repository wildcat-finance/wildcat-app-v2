import {
  assert,
  isSupportedChainId,
  SupportedChainId,
  SupportedChainIds,
} from "@wildcatfi/wildcat-sdk"

export const NETWORKS = {
  Sepolia: {
    chainId: 11155111,
    stringID: "sepolia",
    name: "Sepolia",
    etherscanUrl: "https://sepolia.etherscan.io",
    isTestnet: true,
    hasV1Deployment: true,
  },
  Mainnet: {
    chainId: 1,
    stringID: "mainnet",
    name: "Ethereum Mainnet",
    etherscanUrl: "https://etherscan.io",
    isTestnet: false,
    hasV1Deployment: true,
  },
  PlasmaTestnet: {
    chainId: 9746,
    stringID: "plasma-testnet",
    name: "Plasma Testnet",
    etherscanUrl: "https://testnet.plasmascan.to",
    isTestnet: true,
    hasV1Deployment: false,
  },
  PlasmaMainnet: {
    chainId: 9745,
    stringID: "plasma-mainnet",
    name: "Plasma",
    etherscanUrl: "https://plasmascan.to",
    isTestnet: false,
    hasV1Deployment: false,
  },
}
export type NetworkInfo = (typeof NETWORKS)[keyof typeof NETWORKS]

export const NETWORKS_BY_ID = Object.fromEntries(
  Object.values(NETWORKS).map((network) => [network.chainId, network]),
) as {
  [key in SupportedChainId]: NetworkInfo
}

const TARGET_NETWORK = process.env.NEXT_PUBLIC_TARGET_NETWORK
const isValidNetwork = (network: string): network is keyof typeof NETWORKS =>
  network in NETWORKS

assert(
  typeof TARGET_NETWORK === "string" && isValidNetwork(TARGET_NETWORK),
  `REACT_APP_TARGET_NETWORK is not set or is invalid. Must be one of ${Object.keys(
    NETWORKS,
  ).join(", ")}`,
)
export const TargetNetwork: (typeof NETWORKS)[keyof typeof NETWORKS] =
  NETWORKS[TARGET_NETWORK]

const targetChainId = TargetNetwork.chainId

assert(
  isSupportedChainId(targetChainId),
  `Chain ID ${targetChainId} is not supported. Must be one of ${SupportedChainIds.join(
    ", ",
  )}`,
)

export const TargetChainId: SupportedChainId = targetChainId

export const EtherscanBaseUrl = TargetNetwork.etherscanUrl
