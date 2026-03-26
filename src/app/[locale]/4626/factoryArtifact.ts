import generatedArtifact from "./factory-artifact.generated.json"

export type Supported4626DeploymentChainId = 1 | 11155111

export const WILDCAT_4626_FACTORY_CONTRACT_NAME =
  generatedArtifact.contractName as "Wildcat4626WrapperFactory"

export const WILDCAT_4626_FACTORY_SOURCE_PATH =
  generatedArtifact.sourcePath as "src/vault/Wildcat4626WrapperFactory.sol"

export const WILDCAT_4626_FACTORY_SOURCE_HASH = generatedArtifact.sourceHash

export const WILDCAT_4626_FACTORY_COMPILER_VERSION =
  generatedArtifact.compilerVersion

export const WILDCAT_4626_FACTORY_ABI = generatedArtifact.abi

export const WILDCAT_4626_FACTORY_BYTECODE =
  generatedArtifact.bytecode as string

export const WILDCAT_4626_DEPLOYMENT_TARGETS: Record<
  Supported4626DeploymentChainId,
  {
    chainId: Supported4626DeploymentChainId
    chainName: string
    slug: string
    explorerUrl: string
    archController: string
  }
> = {
  1: {
    chainId: 1,
    chainName: "Ethereum Mainnet",
    slug: "mainnet",
    explorerUrl: "https://etherscan.io",
    archController: "0xfEB516d9D946dD487A9346F6fee11f40C6945eE4",
  },
  11155111: {
    chainId: 11155111,
    chainName: "Sepolia",
    slug: "sepolia",
    explorerUrl: "https://sepolia.etherscan.io",
    archController: "0xC003f20F2642c76B81e5e1620c6D8cdEE826408f",
  },
}
