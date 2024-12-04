import { AccountKind, describeAccount } from "@wildcatfi/wildcat-sdk"
import {
  // eslint-disable-next-line camelcase
  CheckSafeSignature__factory,
  ISafe,
  // eslint-disable-next-line camelcase
  ISafe__factory,
} from "@wildcatfi/wildcat-sdk/dist/typechain"
import { providers, CallOverrides, constants, utils } from "ethers"
import { defaultAbiCoder, hexlify, toUtf8Bytes } from "ethers/lib/utils"

type JsonRpcProvider = providers.JsonRpcProvider

const MAGIC_VALUE = "0x1626ba7e"
const MAGIC_VALUE_BYTES = "0x20c13b0b"

export async function checkSafeSignature(
  provider: JsonRpcProvider,
  address: string,
  message: string,
  signature: string,
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
  const result = await provider.call({ data: bytecode })
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

type VerifySignatureOptions = {
  provider: JsonRpcProvider
  address: string
  /** Whether to allow the signature to be approved by a single owner of a safe */
  allowSingleSafeOwner?: boolean
  message: string
  signature: string
}

async function verifyGnosisSignature(
  address: string,
  provider: JsonRpcProvider,
  message: string,
  signature = "0x",
): Promise<boolean> {
  const safe = getSafe(address, provider)
  if (await checkSafeSignature(provider, address, message, signature)) {
    return true
  }
  if (await check1271Signature(safe, message, signature)) {
    return true
  }
  if (await check1271SignatureBytes(safe, message, signature)) {
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
