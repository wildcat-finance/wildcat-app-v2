import { isOpsDatabaseConfigured, opsPrisma } from "@/lib/opsDb"

import { isLenderKycEncryptionConfigured } from "./crypto"
import { createPrismaLenderKycRepository } from "./repository"

export const lenderKycRepository = createPrismaLenderKycRepository(opsPrisma)

export const isLenderKycStorageConfigured = () =>
  isOpsDatabaseConfigured() && isLenderKycEncryptionConfigured()
export {
  confirmLenderKycOwnership,
  isLenderKycChainSupported,
  issueLenderKycNonce,
  submitLenderKycDetails,
  toLenderKycErrorResponse,
} from "./service"
