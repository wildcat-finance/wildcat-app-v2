import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto"

const ENVELOPE_VERSION = "v1"
const KEY_ENV = "LENDER_KYC_ENCRYPTION_KEY"

export type LenderKycEncryptedField =
  | "fullName"
  | "email"
  | "companyName"
  | "signedMessage"
  | "signature"

export class LenderKycStorageNotConfiguredError extends Error {}

const loadKey = () => {
  const raw = process.env[KEY_ENV]
  if (!raw) {
    throw new LenderKycStorageNotConfiguredError(`${KEY_ENV} is not set`)
  }
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new LenderKycStorageNotConfiguredError(
      `${KEY_ENV} must be 32 bytes encoded as base64`,
    )
  }
  const keyId = createHash("sha256").update(key).digest("hex").slice(0, 8)
  return { key, keyId }
}

export const hashLenderKycSecret = (secret: string) =>
  createHash("sha256").update(secret, "utf8").digest("hex")

export const isLenderKycStorageConfigured = () => {
  try {
    loadKey()
    return true
  } catch {
    return false
  }
}

const additionalData = (field: LenderKycEncryptedField, rowId: string) =>
  Buffer.from(`${field}:${rowId}`, "utf8")

export const encryptLenderKycField = (
  field: LenderKycEncryptedField,
  rowId: string,
  plaintext: string,
) => {
  const { key, keyId } = loadKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  cipher.setAAD(additionalData(field, rowId))
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  return [
    ENVELOPE_VERSION,
    keyId,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":")
}

export const decryptLenderKycField = (
  field: LenderKycEncryptedField,
  rowId: string,
  envelope: string,
) => {
  const [version, keyId, iv, tag, ciphertext] = envelope.split(":")
  const loaded = loadKey()
  if (version !== ENVELOPE_VERSION || !iv || !tag || ciphertext === undefined) {
    throw new Error(`Unsupported lender KYC envelope for ${field}`)
  }
  if (keyId !== loaded.keyId) {
    throw new LenderKycStorageNotConfiguredError(
      `${field} was encrypted with key ${keyId}, but ${KEY_ENV} is key ${loaded.keyId}`,
    )
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    loaded.key,
    Buffer.from(iv, "base64"),
  )
  decipher.setAAD(additionalData(field, rowId))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8")
}
