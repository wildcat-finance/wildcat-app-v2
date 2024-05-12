type ExtensionValue = string | number | boolean | null | undefined

export interface TokenInfo {
  chainId: number
  address: string
  name: string
  decimals: number
  symbol: string
  logoURI?: string
  tags?: string[]
  extensions?: {
    [key: string]:
      | {
          [key: string]:
            | {
                [key: string]: ExtensionValue
              }
            | ExtensionValue
        }
      | ExtensionValue
  }
}

export interface Version {
  major: number
  minor: number
  patch: number
}

export interface Tags {
  [tagId: string]: {
    name: string
    description: string
  }
}

export interface TokenList {
  name: string
  timestamp: string
  version: Version
  tokens: TokenInfo[]
  tokenMap?: {
    [key: string]: TokenInfo
  }
  keywords?: string[]
  tags?: Tags
  logoURI?: string
}
