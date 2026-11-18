import type { MlaLenderSignature } from "@prisma/client"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { MlaTemplateField } from "@/lib/mla"
import { VerifiedSignature } from "@/lib/signatures/interface"

export interface SetMasterLoanAgreementInput {
  /* The chain ID */
  chainId: SupportedChainId
  /* The MLA template ID */
  mlaTemplate: number
  /* Time the MLA was signed */
  timeSigned: number
  /* Signature of the MLA */
  signature: string
}

export interface MlaTemplateMetadata {
  id: number
  isTestnet: boolean
  name: string
  description?: string
  hide?: boolean
  isDefault?: boolean
}

export interface MlaTemplate {
  id: number
  isTestnet: boolean
  name: string
  description?: string
  hide?: boolean
  isDefault?: boolean
  html: string
  plaintext: string
  borrowerFields: MlaTemplateField[]
  lenderFields: MlaTemplateField[]
}

export type CreateMlaTemplateInput = Omit<MlaTemplate, "id" | "isTestnet"> & {
  /* An admin network; the template serves every network of its class */
  chainId: SupportedChainId
}

export type MlaSignatureResponse = {
  kind: VerifiedSignature["kind"]
  address: string
  signer: string
  signature: string
  blockNumber?: number
  chainId: number
  market: string
  timeSigned: Date
}

export const toMlaSignatureResponse = ({
  blockNumber,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  outcome,
  ...rest
}: MlaLenderSignature): MlaSignatureResponse => ({
  ...rest,
  blockNumber: blockNumber ?? undefined,
})

export type MasterLoanAgreementResponse = {
  chainId: number
  market: string
  borrower: string
  html: string
  plaintext: string
  templateId: number
  templateName: string
  lenderFields: MlaTemplateField[]
  borrowerSignature: MlaSignatureResponse
}

export const lastSlaUpdateTime = new Date("2024-01-01T12:00:00Z")
