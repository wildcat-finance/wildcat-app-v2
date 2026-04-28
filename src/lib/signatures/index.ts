import { AccountKind, describeAccount } from "@wildcatfi/wildcat-sdk"
import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  hashMessage,
  isHex,
  keccak256,
  recoverMessageAddress,
  stringToHex,
  zeroAddress,
  type Address,
  type Hex,
} from "viem"

import { VerifiedSignature, VerifySignatureOptions } from "./interface"
import type { ViemProviderLike } from "../viem-provider"

type JsonRpcProvider = ViemProviderLike

type CallOverrides = {
  blockTag?: number | bigint
  from?: string
}

const MAGIC_VALUE = "0x1626ba7e"
const MAGIC_VALUE_BYTES = "0x20c13b0b"

const safeIsValidSignatureBytes32Abi = [
  {
    inputs: [
      { internalType: "bytes32", name: "_dataHash", type: "bytes32" },
      { internalType: "bytes", name: "_signature", type: "bytes" },
    ],
    name: "isValidSignature",
    outputs: [{ internalType: "bytes4", name: "", type: "bytes4" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const safeIsValidSignatureBytesAbi = [
  {
    inputs: [
      { internalType: "bytes", name: "_data", type: "bytes" },
      { internalType: "bytes", name: "_signature", type: "bytes" },
    ],
    name: "isValidSignature",
    outputs: [{ internalType: "bytes4", name: "", type: "bytes4" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const safeGetOwnersAbi = [
  {
    inputs: [],
    name: "getOwners",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const toMessageHex = (message: string): Hex =>
  isHex(message) ? message : stringToHex(message)

async function callSafeIsValidSignatureBytes32(
  safeAddress: string,
  provider: JsonRpcProvider,
  messageHash: Hex,
  signature = "0x",
  { blockTag, ...otherOverrides }: CallOverrides = {},
): Promise<boolean> {
  try {
    const data = encodeFunctionData({
      abi: safeIsValidSignatureBytes32Abi,
      functionName: "isValidSignature",
      args: [messageHash, signature as Hex],
    })
    const result = await provider.call(
      { to: safeAddress, data, ...otherOverrides },
      blockTag,
    )
    const response = decodeFunctionResult({
      abi: safeIsValidSignatureBytes32Abi,
      functionName: "isValidSignature",
      data: result as Hex,
    })
    return response.slice(0, 10).toLowerCase() === MAGIC_VALUE
  } catch (err) {
    return false
  }
}

async function callSafeIsValidSignatureBytes(
  safeAddress: string,
  provider: JsonRpcProvider,
  message: Hex,
  signature = "0x",
  { blockTag, ...otherOverrides }: CallOverrides = {},
): Promise<boolean> {
  try {
    const data = encodeFunctionData({
      abi: safeIsValidSignatureBytesAbi,
      functionName: "isValidSignature",
      args: [message, signature as Hex],
    })
    const result = await provider.call(
      { to: safeAddress, data, ...otherOverrides },
      blockTag,
    )
    const response = decodeFunctionResult({
      abi: safeIsValidSignatureBytesAbi,
      functionName: "isValidSignature",
      data: result as Hex,
    })
    return response.slice(0, 10).toLowerCase() === MAGIC_VALUE_BYTES
  } catch (err) {
    return false
  }
}

export async function checkSafeSignature(
  provider: JsonRpcProvider,
  address: string,
  message: string,
  signature: string,
  { blockTag, ...otherOverrides }: CallOverrides = {},
): Promise<boolean> {
  const messageBytes = toMessageHex(message)
  const isValidBytesSignature = await callSafeIsValidSignatureBytes(
    address,
    provider,
    messageBytes,
    signature,
    { blockTag, ...otherOverrides },
  )
  if (isValidBytesSignature) return true
  return callSafeIsValidSignatureBytes32(
    address,
    provider,
    hashMessage({ raw: messageBytes }),
    signature,
    { blockTag, ...otherOverrides },
  )
}

async function check1271Signature(
  safeAddress: string,
  provider: JsonRpcProvider,
  messageHash: Hex,
  // eslint-disable-next-line default-param-last
  signature = "0x",
  overrides?: CallOverrides,
): Promise<boolean> {
  return callSafeIsValidSignatureBytes32(
    safeAddress,
    provider,
    messageHash,
    signature,
    overrides,
  )
}

async function check1271SignatureBytes(
  safeAddress: string,
  provider: JsonRpcProvider,
  message: Hex,
  // eslint-disable-next-line default-param-last
  signature = "0x",
  overrides?: CallOverrides,
): Promise<boolean> {
  return callSafeIsValidSignatureBytes(
    safeAddress,
    provider,
    message,
    signature,
    overrides,
  )
}

async function getSafeOwners(
  safeAddress: string,
  provider: JsonRpcProvider,
  { blockTag, ...otherOverrides }: CallOverrides = {},
): Promise<Address[]> {
  const data = encodeFunctionData({
    abi: safeGetOwnersAbi,
    functionName: "getOwners",
  })
  const result = await provider.call(
    { to: safeAddress, data, ...otherOverrides },
    blockTag,
  )
  return decodeFunctionResult({
    abi: safeGetOwnersAbi,
    functionName: "getOwners",
    data: result as Hex,
  }) as Address[]
}

async function verifyGnosisSignature(
  address: string,
  provider: JsonRpcProvider,
  message: string,
  // eslint-disable-next-line default-param-last
  signature = "0x",
  overrides?: CallOverrides,
): Promise<boolean> {
  // eip 1271 expects bytes32 digest
  const messageBytes = toMessageHex(message)
  const messageHash = keccak256(messageBytes)
  if (
    await checkSafeSignature(
      provider,
      address,
      messageBytes,
      signature,
      overrides,
    )
  ) {
    return true
  }
  if (
    await check1271Signature(
      address,
      provider,
      messageHash,
      signature,
      overrides,
    )
  ) {
    return true
  }
  if (
    await check1271SignatureBytes(
      address,
      provider,
      messageBytes,
      signature,
      overrides,
    )
  ) {
    return true
  }
  return false
}

async function verifyUserSignature(
  address: string,
  message: string,
  signature: string,
): Promise<boolean> {
  try {
    const signer = await recoverMessageAddress({
      message,
      signature: signature as Hex,
    })
    return signer.toLowerCase() === address.toLowerCase()
  } catch (err) {
    return false
  }
}

async function getUserSignatureAddress(
  message: string,
  signature: string,
): Promise<string | undefined> {
  try {
    const signer = await recoverMessageAddress({
      message,
      signature: signature as Hex,
    })
    return signer
  } catch (err) {
    // throw new HttpException(401, 'Invalid signature');
    return undefined
  }
}

async function getSignatureAddress(
  provider: JsonRpcProvider,
  address: string,
  message: string,
  signature = "0x",
): Promise<string | undefined> {
  try {
    const description = await describeAccount(provider, address)
    if (description.kind === AccountKind.EOA) {
      return getUserSignatureAddress(message, signature)
    }
    if (description.kind === AccountKind.Safe) {
      if (await verifyGnosisSignature(address, provider, message, signature)) {
        return address
      }
    }
    if (description.kind === AccountKind.UnknownContract) {
      if (await verifyGnosisSignature(address, provider, message, signature)) {
        return address
      }
    }
  } catch (err) {
    console.log(`Bad Signature: ${signature}`)
  }
  return zeroAddress
}

export async function verifySignature({
  provider,
  address,
  allowSingleSafeOwner,
  message,
  signature,
}: VerifySignatureOptions): Promise<boolean> {
  const description = await describeAccount(provider, address)
  if (description.kind === AccountKind.EOA) {
    return verifyUserSignature(address, message, signature)
  }
  if (description.kind === AccountKind.Safe) {
    if (allowSingleSafeOwner) {
      try {
        const signer = await getUserSignatureAddress(message, signature)
        if (signer) {
          const owners = (await getSafeOwners(address, provider)).map((owner) =>
            owner.toLowerCase(),
          )
          return owners.includes(signer.toLowerCase())
        }
      } catch (err) {
        console.log(`Not single owner signature: ${signature}`)
      }
    }
    return verifyGnosisSignature(address, provider, message, signature)
  }
  if (description.kind === AccountKind.UnknownContract) {
    return verifyGnosisSignature(address, provider, message, signature)
  }
  // throw new HttpException(405, `Only EOA and Gnosis Safe accounts are supported.`);
  return false
}

export async function verifyAndDescribeSignature({
  provider,
  address,
  allowSingleSafeOwner,
  message,
  signature,
}: VerifySignatureOptions): Promise<VerifiedSignature | undefined> {
  const description = await describeAccount(provider, address)
  if (description.kind === AccountKind.EOA) {
    if (await verifyUserSignature(address, message, signature)) {
      return { kind: "ECDSA", address, signature }
    }
    return undefined
  }
  const blockNumber = await provider.getBlockNumber()
  const overrides: CallOverrides = { blockTag: blockNumber }
  if (description.kind === AccountKind.Safe) {
    if (allowSingleSafeOwner) {
      try {
        const signer = await getUserSignatureAddress(message, signature)
        if (signer) {
          const owners = (
            await getSafeOwners(address, provider, overrides)
          ).map((owner) => owner.toLowerCase())
          if (owners.includes(signer.toLowerCase())) {
            return {
              kind: "GnosisOwnerECDSA",
              address,
              owner: signer,
              blockNumber,
              signature,
            }
          }
        }
      } catch (err) {
        console.log(`Not single owner signature: ${signature}`)
      }
    }
    if (
      await verifyGnosisSignature(
        address,
        provider,
        message,
        signature,
        overrides,
      )
    ) {
      return { kind: "GnosisSignature", address, blockNumber, signature }
    }
  }
  if (description.kind === AccountKind.UnknownContract) {
    // The gnosis signature verification function also checks 1271 signatures
    if (
      await verifyGnosisSignature(
        address,
        provider,
        message,
        signature,
        overrides,
      )
    ) {
      return { kind: "EIP1271", address, blockNumber, signature }
    }
  }
  // throw new HttpException(405, `Only EOA and Gnosis Safe accounts are supported.`);
  return undefined
}

export function formatSignatureText(signature: VerifiedSignature) {
  if (signature.kind === "ECDSA") {
    return [
      "Signature Kind: ECDSA Personal Sign",
      `Address: ${getAddress(signature.address)}`,
      `Signature: ${signature.signature}`,
    ].join("\n")
  }
  if (signature.kind === "GnosisSignature") {
    return [
      "Signature Kind: Gnosis Safe Signature",
      `Gnosis Safe: ${getAddress(signature.address)}`,
      `Signature: ${signature.signature}`,
      `Verified at Block Number: ${signature.blockNumber}`,
    ].join("\n")
  }
  if (signature.kind === "GnosisOwnerECDSA") {
    return [
      "Signature Kind: ECDSA Personal Sign by Owner of Gnosis Safe",
      `Gnosis Safe: ${getAddress(signature.address)}`,
      `Owner: ${getAddress(signature.owner)}`,
      `Signature: ${signature.signature}`,
      `Verified at Block Number: ${signature.blockNumber}`,
    ].join("\n")
  }
  return [
    "Signature Kind: EIP1271 Signature",
    `Address: ${getAddress(signature.address)}`,
    `Signature: ${signature.signature}`,
    `Verified at Block Number: ${signature.blockNumber}`,
  ].join("\n")
}
