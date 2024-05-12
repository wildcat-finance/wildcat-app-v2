import { TokenInfo } from "@/app/api/tokens-list/interface"

export type TokenSelectorProps = {
  onSearch: (value: string) => Promise<TokenInfo[]>
}
