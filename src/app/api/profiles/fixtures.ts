import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import { BorrowerProfile } from "@/app/api/profiles/interface"

const profileFixtures: BorrowerProfile[] = [
  {
    address: "0x1717503ee3f56e644cf8b1058e3f83f03a71b2e1",
    name: "Wintermute LLC",
    description:
      "Leading global algorithmic trading firm and one of the largest players in digital asset markets. With an average daily trading volume of over $5bn.",
    founded: "2017",
    headquarters: "London",
    website: "https://wintermute.com/",
    twitter: "wintermute_t",
    linkedin: "https://uk.linkedin.com/company/wintermute-trading",
    jurisdiction: "UK",
    entityKind: "llc",
    physicalAddress: "48 Station Road, London, N73 8QA",
    email: "example@domain.com",
    chainId: SupportedChainId.Sepolia,
    registeredOnChain: true,
  },
]

const fixturesByChainAndAddress = new Map(
  profileFixtures.map(
    (profile) =>
      [`${profile.chainId}:${profile.address.toLowerCase()}`, profile] as const,
  ),
)

const profileFixturesEnabled = () =>
  process.env.WILDCAT_ENABLE_PROFILE_FIXTURES === "true"

export const getProfileFixture = (
  address: string,
  chainId: SupportedChainId,
): BorrowerProfile | undefined => {
  if (!profileFixturesEnabled()) {
    return undefined
  }

  return fixturesByChainAndAddress.get(`${chainId}:${address.toLowerCase()}`)
}
