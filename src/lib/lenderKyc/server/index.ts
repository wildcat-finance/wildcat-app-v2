import { prisma } from "@/lib/db"

import { createPrismaLenderKycRepository } from "./repository"

export const lenderKycRepository = createPrismaLenderKycRepository(prisma)

export { isLenderKycStorageConfigured } from "./crypto"
export {
  confirmLenderKycOwnership,
  isLenderKycChainSupported,
  issueLenderKycNonce,
  submitLenderKycDetails,
  toLenderKycErrorResponse,
} from "./service"
