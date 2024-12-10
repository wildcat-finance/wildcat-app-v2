import { AccountKind, describeAccount } from "@wildcatfi/wildcat-sdk"
import {
  // eslint-disable-next-line camelcase
  CheckSafeSignature__factory,
  ISafe,
  // eslint-disable-next-line camelcase
  ISafe__factory,
} from "@wildcatfi/wildcat-sdk/dist/typechain"
import { providers, CallOverrides, constants, utils } from "ethers"
import {
  defaultAbiCoder,
  getAddress,
  hexlify,
  toUtf8Bytes,
} from "ethers/lib/utils"

import { VerifiedSignature, VerifySignatureOptions } from "./interface"

type JsonRpcProvider = providers.JsonRpcProvider

const MAGIC_VALUE = "0x1626ba7e"
const MAGIC_VALUE_BYTES = "0x20c13b0b"

export async function checkSafeSignature(
  provider: JsonRpcProvider,
  address: string,
  message: string,
  signature: string,
  { blockTag, ...otherOverrides }: CallOverrides = {},
): Promise<boolean[]> {
  if (!message.startsWith("0x")) {
    message = hexlify(toUtf8Bytes(message))
  }
  // eslint-disable-next-line camelcase
  const bytecode = CheckSafeSignature__factory.bytecode.concat(
    defaultAbiCoder
      .encode(["address", "bytes", "bytes"], [address, message, signature])
      .slice(2),
  )
  const result = await provider.call(
    { data: bytecode, ...otherOverrides },
    blockTag,
  )
  return defaultAbiCoder.decode(["bool"], result)[0]
}

function getSafe(safeAddress: string, provider: JsonRpcProvider) {
  // eslint-disable-next-line camelcase
  return ISafe__factory.connect(safeAddress, provider)
}

async function check1271Signature(
  safe: ISafe,
  messageHash: string,
  // eslint-disable-next-line default-param-last
  signature = "0x",
  overrides?: CallOverrides,
): Promise<boolean> {
  try {
    const response = await safe["isValidSignature(bytes32,bytes)"](
      messageHash,
      signature,
      overrides,
    )
    return response.slice(0, 10).toLowerCase() === MAGIC_VALUE
  } catch (err) {
    return false
  }
}

async function check1271SignatureBytes(
  safe: ISafe,
  messageHash: string,
  // eslint-disable-next-line default-param-last
  signature = "0x",
  overrides?: CallOverrides,
): Promise<boolean> {
  try {
    const response = await safe["isValidSignature(bytes,bytes)"](
      messageHash,
      signature,
      overrides,
    )
    return response.slice(0, 10).toLowerCase() === MAGIC_VALUE_BYTES
  } catch (err) {
    return false
  }
}

async function verifyGnosisSignature(
  address: string,
  provider: JsonRpcProvider,
  message: string,
  // eslint-disable-next-line default-param-last
  signature = "0x",
  overrides?: CallOverrides,
): Promise<boolean> {
  const safe = getSafe(address, provider)
  if (
    await checkSafeSignature(provider, address, message, signature, overrides)
  ) {
    return true
  }
  if (await check1271Signature(safe, message, signature, overrides)) {
    return true
  }
  if (await check1271SignatureBytes(safe, message, signature, overrides)) {
    return true
  }
  return false
}

function verifyUserSignature(
  address: string,
  message: string,
  signature: string,
): boolean {
  try {
    const signer = utils.verifyMessage(message, signature)
    return signer.toLowerCase() === address.toLowerCase()
  } catch (err) {
    return false
  }
}

function getUserSignatureAddress(
  message: string,
  signature: string,
): string | undefined {
  try {
    const signer = utils.verifyMessage(message, signature)
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
  } catch (err) {
    console.log(`Bad Signature: ${signature}`)
  }
  return constants.AddressZero
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
        const signer = getUserSignatureAddress(message, signature)
        if (signer) {
          const owners = (await getSafe(address, provider).getOwners()).map(
            (owner) => owner.toLowerCase(),
          )
          return owners.includes(signer.toLowerCase())
        }
      } catch (err) {
        console.log(`Not single owner signature: ${signature}`)
      }
    }
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
    if (verifyUserSignature(address, message, signature)) {
      return { kind: "ECDSA", address, signature }
    }
    return undefined
  }
  const blockNumber = await provider.getBlockNumber()
  const overrides: CallOverrides = { blockTag: blockNumber }
  if (description.kind === AccountKind.Safe) {
    if (allowSingleSafeOwner) {
      try {
        const signer = getUserSignatureAddress(message, signature)
        if (signer) {
          const owners = (
            await getSafe(address, provider).getOwners(overrides)
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
