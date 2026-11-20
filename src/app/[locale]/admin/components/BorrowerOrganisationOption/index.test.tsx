/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"

import { BorrowerOrganisationOption, describeOrganisationWallets } from "."

const WALLET = `0x${"a".repeat(36)}16c8`
const OTHER_WALLET = `0x${"b".repeat(36)}9f01`

it("tells organisations of the same name apart by network and wallet", () => {
  expect(
    describeOrganisationWallets([
      { chainId: 11155111, address: WALLET },
      { chainId: 9746, address: OTHER_WALLET },
    ]),
  ).toBe("Sepolia 0xaaaa...16c8 · Plasma Testnet 0xbbbb...9f01")
})

it("shows the name, alias and wallets", () => {
  render(
    <BorrowerOrganisationOption
      organisation={{
        id: "org",
        isTestnet: true,
        name: "Lemon",
        alias: "Lemon Finance",
        registrations: [{ chainId: 11155111, address: WALLET }],
      }}
    />,
  )
  screen.getByText("Lemon (Lemon Finance)")
  screen.getByText("Sepolia 0xaaaa...16c8")
})
