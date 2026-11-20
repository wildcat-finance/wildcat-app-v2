import { LENDER_KYC_TERMS_VERSION } from "@/config/lender-kyc"
import { LenderKycWalletRow } from "@/lib/lenderKyc/types"

export const LENDER_KYC_SAMPLE_ROWS: LenderKycWalletRow[] = [
  {
    address: "0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b9fe0",
    chainId: 1,
    firstSignedAt: "2026-11-12T09:41:00.000Z",
    lastSignedAt: "2026-11-20T14:05:00.000Z",
    termsVersion: LENDER_KYC_TERMS_VERSION,
    details: {
      fullName: "Jane Doe",
      email: "jane@newcompany.com",
      companyName: "Company Ltd",
      lenderTypes: ["assetManagerInstitutionalFund", "corporateTreasury"],
    },
  },
  {
    address: "0x7c4d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b11ab",
    chainId: 1,
    firstSignedAt: "2026-11-15T16:11:00.000Z",
    lastSignedAt: "2026-11-15T16:11:00.000Z",
    termsVersion: LENDER_KYC_TERMS_VERSION,
    details: {
      fullName: "Jane Doe",
      email: "jane@newcompany.com",
      companyName: "Company Ltd",
      lenderTypes: ["individual"],
    },
  },
  {
    address: "0x3e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5da02c",
    chainId: 1,
    firstSignedAt: "2026-11-16T08:03:30.000Z",
    lastSignedAt: "2026-11-16T08:03:30.000Z",
    termsVersion: LENDER_KYC_TERMS_VERSION,
  },
]
