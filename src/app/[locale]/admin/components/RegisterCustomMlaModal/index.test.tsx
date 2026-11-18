/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen, within } from "@testing-library/react"

import { RegisterCustomMlaModal } from "."

const mutate = jest.fn()

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
        name: "Test Borrower",
        registrations: [],
      },
    ],
  }),
}))
jest.mock("../../hooks/useCustomMlaTemplates", () => ({
  useRegisterCustomMla: () => ({
    mutate,
    isPending: false,
    error: null,
    reset: jest.fn(),
  }),
}))

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

it("registers a hand-entered custom MLA with the fields its text uses", () => {
  render(<RegisterCustomMlaModal />)
  fireEvent.click(screen.getByText("admin.customMla.register"))

  fireEvent.mouseDown(screen.getByLabelText("admin.customMla.borrower"))
  fireEvent.click(
    within(screen.getByRole("listbox")).getByText("Test Borrower"),
  )
  type("admin.customMla.name", "Borrower MLA")
  type("admin.customMla.version", "2024-1")
  type(
    "admin.customMla.plaintext",
    "Between {{borrower.name}} and {{lender.address}}.",
  )

  const submit = () =>
    screen
      .getByText("admin.customMla.submit")
      .closest("button") as HTMLButtonElement
  expect(submit().disabled).toBe(true)
  screen.getByText(
    "{{borrower.name}} is used in the text but not listed as a field",
  )

  fireEvent.click(screen.getByText("admin.customMla.detectFields"))
  expect(submit().disabled).toBe(false)
  fireEvent.click(submit())

  expect(mutate).toHaveBeenCalledWith(
    {
      borrowerId: "11111111-1111-4111-8111-111111111111",
      name: "Borrower MLA",
      version: "2024-1",
      description: undefined,
      plaintext: "Between {{borrower.name}} and {{lender.address}}.",
      html: undefined,
      borrowerFields: [
        { source: "borrower.name", placeholder: "[borrower.name]" },
      ],
      lenderFields: [
        { source: "lender.address", placeholder: "[lender.address]" },
      ],
    },
    expect.anything(),
  )
})
