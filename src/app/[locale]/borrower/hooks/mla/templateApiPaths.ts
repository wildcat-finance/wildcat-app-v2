export const getMlaTemplatesApiPath = (chainId: number) =>
  `/api/mla/templates?chainId=${chainId}`

export const getMlaTemplateApiPath = (id: number, chainId: number) =>
  `/api/mla/templates/${id}?chainId=${chainId}`
