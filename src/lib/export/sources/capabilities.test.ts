/** @jest-environment node */

import { Deployments } from "@wildcatfi/wildcat-sdk"

import { EXPORT_CHAIN_IDS } from "../types"

describe("export chain capabilities", () => {
  it.each(EXPORT_CHAIN_IDS)(
    "has canonical discovery deployments for chain %s",
    (chainId) => {
      expect(Deployments[chainId]?.WildcatArchController).toMatch(
        /^0x[0-9a-f]{40}$/i,
      )
      expect(Deployments[chainId]?.HooksFactory).toMatch(/^0x[0-9a-f]{40}$/i)
    },
  )
})
