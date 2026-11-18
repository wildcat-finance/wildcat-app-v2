/// The name prefix a new market is deployed with. The market contract appends
/// the asset's name directly, so the space between them comes from here. The
/// MLA a borrower signs at creation must name the market the same way the
/// contract will, or the server rejects the signature.
export const toDeployedNamePrefix = (namePrefix: string) =>
  `${namePrefix.trimEnd()} `

/// The on-chain name of a market deployed with this prefix and asset.
export const toDeployedMarketName = (namePrefix: string, assetName: string) =>
  `${toDeployedNamePrefix(namePrefix)}${assetName}`
