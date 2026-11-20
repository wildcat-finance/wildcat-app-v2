import { MlaTemplate } from "@/app/api/mla/interface"

/// A custom MLA is visible only with its borrower's API token for the
/// network, so template requests send the token when there is one.
export const mlaTemplateRequestInit = (authToken?: string): RequestInit =>
  authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {}

export const fetchMlaTemplate = async (
  chainId: number,
  id: number,
  authToken?: string,
): Promise<MlaTemplate> => {
  const response = await fetch(
    `/api/mla/templates/${id}?chainId=${chainId}`,
    mlaTemplateRequestInit(authToken),
  )
  if (!response.ok) throw new Error(`MLA template ${id} not found`)
  return response.json()
}
