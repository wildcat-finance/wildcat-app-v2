import { providers } from "ethers"

type JsonRpcProvider = providers.JsonRpcProvider

export type VerifiedSignature =
  | {
      kind: "ECDSA"
      signature: string
      address: string
    }
  | {
      kind: "GnosisSignature"
      signature: string
      address: string
      blockNumber: number
    }
  | {
      kind: "GnosisOwnerECDSA"
      signature: string
      address: string
      owner: string
      blockNumber: number
    }
  | {
      kind: "EIP1271"
      signature: string
      address: string
      blockNumber: number
    }

export type VerifySignatureOptions = {
  provider: JsonRpcProvider
  address: string
  /** Whether to allow the signature to be approved by a single owner of a safe */
  allowSingleSafeOwner?: boolean
  message: string
  signature: string
}
