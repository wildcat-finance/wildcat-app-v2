import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

export type ProfilePageProps = {
  type: "external" | "internal"
  profileAddress: `0x${string}` | undefined
  chainId?: SupportedChainId
}
