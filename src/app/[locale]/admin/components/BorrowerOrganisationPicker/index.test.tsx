/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen, within } from "@testing-library/react"

import { BorrowerOrganisation } from "@/app/api/borrowers/interface"

import { BorrowerOrganisationPicker, getOrganisationSearchText } from "."

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/assets/icons/downArrow20_icon.svg", () => () => null)

const LEMON_WALLET = `0x${"a".repeat(36)}16c8`

const ORGANISATIONS: BorrowerOrganisation[] = [
  {
    id: "1",
    isTestnet: true,
    name: "Apple Credit",
    registrations: [{ chainId: 11155111, address: `0x${"b".repeat(40)}` }],
  },
  {
    id: "2",
    isTestnet: true,
    name: "Lemon Ltd",
    alias: "Lemon Finance",
    registrations: [{ chainId: 11155111, address: LEMON_WALLET }],
  },
  { id: "3", isTestnet: true, name: "Lime Partners", registrations: [] },
]

const renderPicker = (value = "") => {
  const onChange = jest.fn()
  render(
    <BorrowerOrganisationPicker
      organisations={ORGANISATIONS}
      value={value}
      onChange={onChange}
      label="Borrower"
    />,
  )
  return onChange
}

const input = () => screen.getByRole("combobox") as HTMLInputElement

// A click focuses the field, which opens the list; typing needs the focus.
const open = () => fireEvent.focus(input())

const type = (text: string) => {
  open()
  fireEvent.change(input(), { target: { value: text } })
}

const listed = () =>
  within(screen.getByRole("listbox"))
    .getAllByRole("option")
    .map((option) => option.textContent)

it("narrows the list as a name is typed", () => {
  renderPicker()
  open()
  expect(listed()).toHaveLength(3)
  type("l")
  expect(listed()).toHaveLength(3)
  type("li")
  expect(listed()).toEqual(["Lime Partners"])
  type("  LEM ")
  expect(listed()).toEqual(["Lemon Ltd (Lemon Finance)Sepolia 0xaaaa...16c8"])
})

it("finds a borrower by its alias or a pasted wallet", () => {
  renderPicker()
  type("finance")
  expect(listed()).toHaveLength(1)
  type(LEMON_WALLET)
  expect(listed()).toEqual(["Lemon Ltd (Lemon Finance)Sepolia 0xaaaa...16c8"])
})

it("takes the first match on Enter", () => {
  const onChange = renderPicker()
  type("lem")
  fireEvent.keyDown(input(), { key: "Enter" })
  expect(onChange).toHaveBeenCalledWith("2")
})

it("says when nothing matches", () => {
  renderPicker()
  type("zzz")
  screen.getByText("admin.borrowerPicker.noMatch")
})

it("says while borrowers load", () => {
  render(
    <BorrowerOrganisationPicker
      organisations={undefined}
      value=""
      onChange={jest.fn()}
      label="Borrower"
    />,
  )
  open()
  screen.getByText("admin.borrowerPicker.loading")
})

it("shows the chosen borrower and can clear it", () => {
  const onChange = renderPicker("2")
  expect(input().value).toBe("Lemon Ltd (Lemon Finance)")
  fireEvent.click(screen.getByTitle("Clear"))
  expect(onChange).toHaveBeenCalledWith("")
})

it("searches the name, alias and every wallet", () => {
  expect(getOrganisationSearchText(ORGANISATIONS[1])).toBe(
    `Lemon Ltd Lemon Finance ${LEMON_WALLET}`,
  )
})
