/// A borrowing organisation and its addresses on the networks of its class.
export type BorrowerOrganisation = {
  id: string
  isTestnet: boolean
  name: string
  alias?: string
  registrations: { chainId: number; address: string }[]
}
