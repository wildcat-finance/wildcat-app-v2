import { Prisma } from "@prisma/client"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextRequest } from "next/server"
import { isAddress } from "viem"

import {
  isAdminForNetworkClass,
  verifyApiToken,
} from "@/app/api/auth/verify-header"
import { findBorrowerRegistration } from "@/lib/db"
import { isTestnetChain } from "@/lib/networkClass"
import { isMlaTemplateSignableAt } from "@/utils/mlaTemplateRetirement"

/// Who is asking for MLA templates on a network: the organisation of the
/// wallet the request names in `borrower`, if it borrows on that network, and
/// whether the caller is logged in as an admin of the network's class. Custom
/// MLAs are visible to their borrower and to admins. Naming a wallet needs no
/// signature: the app sends the wallet it is connected with, and asking a
/// borrower to log in just to see its custom MLAs was judged not worth it.
export type MlaTemplateViewer = {
  borrowerId?: string
  isAdmin: boolean
}

export async function getMlaTemplateViewer(
  request: NextRequest,
  chainId: SupportedChainId,
): Promise<MlaTemplateViewer> {
  const wallet = request.nextUrl.searchParams.get("borrower")
  const token = await verifyApiToken(request)
  const [registration, isAdmin] = await Promise.all([
    wallet && isAddress(wallet)
      ? findBorrowerRegistration(chainId, wallet)
      : undefined,
    token && token.chainId === chainId
      ? isAdminForNetworkClass(token, isTestnetChain(chainId))
      : false,
  ])
  return { borrowerId: registration?.borrowerId, isAdmin }
}

/// Templates a borrower may pick for a new market: the class's market MLAs
/// and the borrower's own custom MLAs, none of them retired.
export const selectableMlaTemplatesWhere = (
  isTestnet: boolean,
  borrowerId: string | undefined,
): Prisma.MlaTemplateWhereInput => ({
  isTestnet,
  retiredAt: null,
  OR: [{ borrowerId: null }, ...(borrowerId ? [{ borrowerId }] : [])],
})

export const canViewMlaTemplate = (
  template: { borrowerId: string | null },
  viewer: MlaTemplateViewer,
) =>
  template.borrowerId === null ||
  viewer.isAdmin ||
  template.borrowerId === viewer.borrowerId

/// Whether a borrower may attach the template to a market with an agreement
/// signed at `timeSigned`. This is the rule that matters: lists only present
/// it. Hidden templates stay acceptable: hiding only takes a template off the
/// pick lists, and agreements signed from a list before it was hidden must
/// still upload after their market deploys.
export const canSelectMlaTemplate = (
  template: { borrowerId: string | null; retiredAt: Date | null },
  borrowerId: string,
  timeSigned: number,
) =>
  isMlaTemplateSignableAt(template.retiredAt, timeSigned) &&
  (template.borrowerId === null || template.borrowerId === borrowerId)
