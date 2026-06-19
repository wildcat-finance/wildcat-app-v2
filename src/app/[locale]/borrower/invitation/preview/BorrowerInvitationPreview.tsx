"use client"

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { BorrowerInvitation } from "@/app/api/invite/interface"

import { AcceptInvitationForm } from "../components/AcceptInvitationForm"

const PREVIEW_ADDRESS = "0x0000000000000000000000000000000000000001"

const previewInvitation: BorrowerInvitation = {
  id: 0,
  inviter: "preview",
  chainId: SupportedChainId.Sepolia,
  address: PREVIEW_ADDRESS,
  name: "Preview Borrower LLC",
  timeInvited: new Date(),
  registeredOnChain: false,
}

export const BorrowerInvitationPreview = () => (
  <AcceptInvitationForm
    invitation={previewInvitation}
    address={PREVIEW_ADDRESS}
    previewMode
  />
)
