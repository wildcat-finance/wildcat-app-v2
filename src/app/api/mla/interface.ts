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
  /* Set on a custom MLA, which only its borrower may select */
  borrowerId?: string
  version?: string
  description?: string
  hide?: boolean
  isDefault?: boolean
}

export interface MlaTemplate extends MlaTemplateMetadata {
  html: string
  plaintext: string
  borrowerFields: MlaTemplateField[]
  lenderFields: MlaTemplateField[]
  /* Set once a custom MLA is retired: no agreement signed later may use it */
  retiredAt?: Date
}

export type CreateMlaTemplateInput = Omit<
  MlaTemplate,
  "id" | "isTestnet" | "html" | "borrowerId" | "retiredAt"
> & {
  /* An admin network; the template serves every network of its class */
  chainId: SupportedChainId
  /* Generated from the plain text when omitted */
  html?: string
}

/// A custom MLA as an admin registers it: both texts of the borrower's copy
/// of the market MLA. Its fields are worked out from the placeholders.
export type CreateCustomMlaInput = {
  /* An admin network; the MLA serves every network of its class */
  chainId: SupportedChainId
  borrowerId: string
  name: string
  version: string
  description?: string
  /* The agreement as borrowers and lenders read it */
  html: string
  /* The same agreement as plain text; this is what is signed */
  plaintext: string
}

/// A custom MLA as the admin screen lists it.
export type CustomMlaTemplateForAdminView = MlaTemplateMetadata & {
  borrowerId: string
  borrowerName: string
  version: string
  retiredAt?: Date
  /* Markets whose agreement was filled from this template */
  marketCount: number
}

export type UpdateMlaTemplateInput = {
  /* Retiring removes the template from every pick list; it cannot be undone */
  retired: true
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
  templateVersion?: string
  /* The agreement was filled from a custom MLA registered for this borrower */
  isCustomTemplate: boolean
  lenderFields: MlaTemplateField[]
  borrowerSignature: MlaSignatureResponse
}

export const lastSlaUpdateTime = new Date("2024-01-01T12:00:00Z")
