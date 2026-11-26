import { MlaTemplate } from "@/app/api/mla/interface"

/// Where to ask for MLA templates on a network. A custom MLA is listed and
/// returned for its borrower's wallets, so a request names the borrower's
/// wallet when there is one.
export const mlaTemplatesUrl = (
  path: string,
  chainId: number,
  borrower?: string,
) =>
  `/api/mla/templates${path}?chainId=${chainId}${
    borrower ? `&borrower=${borrower.toLowerCase()}` : ""
  }`

/// One template in full. Borrowers name their wallet; admins, who may read
/// any custom MLA, send their API token instead.
export const fetchMlaTemplate = async (
  chainId: number,
  id: number,
  { borrower, authToken }: { borrower?: string; authToken?: string } = {},
): Promise<MlaTemplate> => {
  const response = await fetch(
    mlaTemplatesUrl(`/${id}`, chainId, borrower),
    authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {},
  )
  if (!response.ok) throw new Error(`MLA template ${id} not found`)
  return response.json()
}
