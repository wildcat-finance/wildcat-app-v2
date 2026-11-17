import { prisma } from "@/lib/db"

import { createPrismaLenderKycRepository } from "./repository"

export const lenderKycRepository = createPrismaLenderKycRepository(prisma)

export { isLenderKycStorageConfigured } from "./crypto"
export {
  closeStaleLenderKycStarts,
  confirmLenderKycOwnership,
  isLenderKycChainSupported,
  issueLenderKycNonce,
  submitLenderKycDetails,
  toLenderKycErrorResponse,
} from "./service"
