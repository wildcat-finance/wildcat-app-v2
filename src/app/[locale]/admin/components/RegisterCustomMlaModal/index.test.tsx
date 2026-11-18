/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen, within } from "@testing-library/react"

import { nextCustomMlaVersion, RegisterCustomMlaModal } from "."

const mutate = jest.fn()
const BORROWER_ID = "11111111-1111-4111-8111-111111111111"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/components/TxModalComponents/TxModalHeader", () => ({
  TxModalHeader: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))
jest.mock("../../hooks/useBorrowerOrganisations", () => ({
  useBorrowerOrganisations: () => ({
    data: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        isTestnet: true,
        name: "Lemon Ltd",
        registrations: [],
      },
    ],
  }),
}))
jest.mock("../../hooks/useCustomMlaTemplates", () => ({
  useCustomMlaTemplates: () => ({
    data: [
      {
        id: 4,
        borrowerId: "11111111-1111-4111-8111-111111111111",
        name: "Lemon Ltd MLA",
        version: "2",
      },
    ],
  }),
  useRegisterCustomMla: () => ({
    mutate,
    isPending: false,
    error: null,
    reset: jest.fn(),
  }),
}))

const submit = () =>
  screen
    .getByText("admin.customMla.submit")
    .closest("button") as HTMLButtonElement

it("prefills name and version from the borrower and registers the pasted text", () => {
  render(<RegisterCustomMlaModal />)
  fireEvent.click(screen.getByText("admin.customMla.register"))

  fireEvent.mouseDown(screen.getByLabelText("admin.customMla.borrower"))
  fireEvent.click(within(screen.getByRole("listbox")).getByText("Lemon Ltd"))
  expect(
    (screen.getByLabelText("admin.customMla.name") as HTMLInputElement).value,
  ).toBe("Lemon Ltd MLA")
  expect(
    (screen.getByLabelText("admin.customMla.version") as HTMLInputElement)
      .value,
  ).toBe("3")
  expect(submit().disabled).toBe(true)

  const text = "MASTER LOAN AGREEMENT\n\n1. Facility. Terms as agreed."
  fireEvent.change(screen.getByLabelText("admin.customMla.text"), {
    target: { value: text },
  })
  expect(submit().disabled).toBe(false)
  fireEvent.click(submit())

  expect(mutate).toHaveBeenCalledWith(
    {
      borrowerId: BORROWER_ID,
      name: "Lemon Ltd MLA",
      version: "3",
      description: undefined,
      text,
    },
    expect.anything(),
  )
})

it("refuses text containing {{", () => {
  render(<RegisterCustomMlaModal />)
  fireEvent.click(screen.getByText("admin.customMla.register"))
  fireEvent.change(screen.getByLabelText("admin.customMla.text"), {
    target: { value: "Pay {{amount}}" },
  })
  screen.getByText("admin.customMla.braces")
  expect(submit().disabled).toBe(true)
})

it("suggests the next version number", () => {
  expect(nextCustomMlaVersion([])).toBe("1")
  expect(nextCustomMlaVersion([{ version: "1" }, { version: "4" }])).toBe("5")
  expect(nextCustomMlaVersion([{ version: "v1" }, { version: "v2" }])).toBe("3")
})
