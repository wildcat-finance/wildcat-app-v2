/* eslint-disable import/no-extraneous-dependencies */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"

import { dummyCustomMla } from "@/app/api/mla/__fixtures__/dummyCustomMla"

import {
  findPlaceholderSource,
  nextCustomMlaVersion,
  RegisterCustomMlaModal,
} from "."

const mutate = jest.fn()
const downloadPdf = jest.fn()
const BORROWER_ID = "11111111-1111-4111-8111-111111111111"

// The stored templates the dialog can start from: the class's market MLA and
// the borrower's earlier custom MLA.
const STORED_TEMPLATES: Record<number, object> = {
  1: {
    id: 1,
    html: dummyCustomMla.html,
    plaintext: dummyCustomMla.plaintext,
    borrowerFields: [
      { source: "market.apr", placeholder: "Annual Interest Rate" },
    ],
    lenderFields: [{ source: "lender.address", placeholder: "Lender Wallet" }],
  },
  4: {
    id: 4,
    html: "<p>Lemon terms for {{market.address}}</p>",
    plaintext: "Lemon terms for {{market.address}}",
    borrowerFields: [{ source: "market.address", placeholder: "Market" }],
    lenderFields: [],
  },
}

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/assets/icons/downArrow20_icon.svg", () => () => null)
jest.mock("@/components/TxModalComponents/TxModalHeader", () => ({
  TxModalHeader: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))
jest.mock("@/app/[locale]/borrower/hooks/mla/useGetMlaTemplates", () => ({
  useGetMlaTemplates: () => ({
    data: [{ id: 1, isTestnet: true, name: "Wildcat MLA", isDefault: true }],
  }),
}))
jest.mock("@/app/[locale]/borrower/hooks/mla/useGetMlaTemplate", () => ({
  useGetMlaTemplate: (id: number | undefined) => ({
    data: id === undefined ? undefined : STORED_TEMPLATES[id],
    isLoading: false,
  }),
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
  useDownloadMlaPdf: () => ({ mutate: downloadPdf, isPending: false }),
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

const field = (label: string) =>
  screen.getByLabelText(label) as HTMLTextAreaElement

const edit = (label: string, value: string) =>
  fireEvent.change(field(label), { target: { value } })

const openForLemon = () => {
  render(<RegisterCustomMlaModal />)
  fireEvent.click(screen.getByText("admin.customMla.register"))
  fireEvent.mouseDown(screen.getByLabelText("admin.customMla.borrower"))
  fireEvent.click(within(screen.getByRole("listbox")).getByText("Lemon Ltd"))
}

beforeEach(() => {
  mutate.mockClear()
  downloadPdf.mockClear()
})

it("carries text edits into the HTML, previews it and registers both", async () => {
  openForLemon()
  expect(
    (screen.getByLabelText("admin.customMla.name") as HTMLInputElement).value,
  ).toBe("Lemon Ltd MLA")
  expect(
    (screen.getByLabelText("admin.customMla.version") as HTMLInputElement)
      .value,
  ).toBe("3")
  expect(field("admin.customMla.textTitle").value).toBe(
    dummyCustomMla.plaintext,
  )

  const plaintext = dummyCustomMla.plaintext.replace(
    "England and Wales",
    "Singapore",
  )
  edit("admin.customMla.textTitle", plaintext)
  expect(submit().disabled).toBe(false)
  await waitFor(() => {
    const preview = screen
      .getByTitle("admin.customMla.preview")
      .getAttribute("srcdoc")
    expect(preview).toContain("the laws of Singapore")
    expect(preview).toContain(
      "Interest accrues at [Annual Interest Rate] a year",
    )
    expect(preview).toContain("holder of wallet [Lender Wallet]")
  })

  fireEvent.click(screen.getByText("admin.customMla.editHtml"))
  expect(field("admin.customMla.htmlTitle").value).toContain(
    "<p><span>4. Governing law. This agreement is governed by the laws of Singapore.</span></p>",
  )

  fireEvent.click(submit())
  expect(mutate).toHaveBeenCalledWith(
    {
      borrowerId: BORROWER_ID,
      name: "Lemon Ltd MLA",
      version: "3",
      description: undefined,
      html: dummyCustomMla.html.replace("England and Wales", "Singapore"),
      plaintext,
    },
    expect.anything(),
  )
})

it("lists a new paragraph until it is added to the HTML by hand", () => {
  openForLemon()
  const clause = "5. Notices. Notices are sent by email."
  edit("admin.customMla.textTitle", `${dummyCustomMla.plaintext}\n\n${clause}`)
  screen.getByText("admin.customMla.unplacedTitle")
  screen.getByText("admin.customMla.unplaced.add")
  expect(submit().disabled).toBe(true)

  fireEvent.click(screen.getByText("admin.customMla.editHtml"))
  const body = field("admin.customMla.htmlTitle").value
  edit("admin.customMla.htmlTitle", `${body}<p><span>${clause}</span></p>\n`)
  expect(screen.queryByText("admin.customMla.unplacedTitle")).toBeNull()
  expect(screen.queryByText("admin.customMla.missingTitle")).toBeNull()
  expect(submit().disabled).toBe(false)
  fireEvent.click(submit())
  const [{ html }] = mutate.mock.calls[0]
  expect(html).toContain(`<p><span>${clause}</span></p>`)
})

it("will not register a placeholder the app does not know", () => {
  openForLemon()
  edit(
    "admin.customMla.textTitle",
    dummyCustomMla.plaintext.replace("{{market.apr}}", "{{market.ap}}"),
  )
  screen.getByText("admin.customMla.problems")
  screen.getByText("{{market.ap}} is not a known field")
  expect(submit().disabled).toBe(true)
})

it("will not reuse a version the borrower has, under any name", () => {
  openForLemon()
  edit("admin.customMla.name", "Lemon Ltd Side Letter")
  edit("admin.customMla.version", " 2 ")
  screen.getByText("admin.customMla.versionTaken")
  expect(submit().disabled).toBe(true)

  edit("admin.customMla.version", "4")
  expect(screen.queryByText("admin.customMla.versionTaken")).toBeNull()
  expect(submit().disabled).toBe(false)
})

it("starts a new version from the borrower's earlier custom MLA", () => {
  openForLemon()
  fireEvent.mouseDown(screen.getByLabelText("admin.customMla.startFrom"))
  const options = within(screen.getByRole("listbox"))
  options.getByText("Wildcat MLA")
  fireEvent.click(options.getByText("mla.customMla"))
  expect(field("admin.customMla.textTitle").value).toBe(
    "Lemon terms for {{market.address}}",
  )
  fireEvent.click(screen.getByText("admin.customMla.editHtml"))
  expect(field("admin.customMla.htmlTitle").value.trim()).toBe(
    "<p>Lemon terms for {{market.address}}</p>",
  )
})

it("imports a Google Docs .html as the agreement, until a stored MLA is chosen again", async () => {
  openForLemon()
  const html =
    '<html><head><style>.lst-kix_a-0>li:before{content:"" counter(lst-ctn-kix_a-0,decimal) ". "}</style></head>' +
    '<body><ol class="lst-kix_a-0 start" start="1"><li><span>Interest accrues at {{market.apr}} a year.</span></li></ol></body></html>'
  const file = new File([html], "Lemon MLA.html", { type: "text/html" })
  Object.defineProperty(file, "text", { value: () => Promise.resolve(html) })
  const input = screen
    .getByText("admin.customMla.importHtml")
    .closest("label")
    ?.querySelector("input") as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })

  const text = "1. Interest accrues at {{market.apr}} a year."
  await waitFor(() =>
    expect(field("admin.customMla.textTitle").value).toBe(text),
  )
  screen.getByText("Lemon MLA.html")
  await waitFor(() => expect(submit().disabled).toBe(false))
  fireEvent.click(submit())
  expect(mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      plaintext: text,
      html: expect.stringContaining('<ol class="lst-kix_a-0 start"'),
    }),
    expect.anything(),
  )

  fireEvent.mouseDown(screen.getByLabelText("admin.customMla.startFrom"))
  fireEvent.click(within(screen.getByRole("listbox")).getByText("Wildcat MLA"))
  await waitFor(() =>
    expect(field("admin.customMla.textTitle").value).toBe(
      dummyCustomMla.plaintext,
    ),
  )
})

it("labels fields from the class's default market MLA", () => {
  const base = { isTestnet: true, isDefault: false }
  expect(
    findPlaceholderSource([
      { ...base, id: 3, name: "Lemon MLA", borrowerId: "org", isDefault: true },
      { ...base, id: 4, name: "Wildcat MLA 2024" },
      { ...base, id: 5, name: "Wildcat MLA 2025", isDefault: true },
    ])?.id,
  ).toBe(5)
  expect(
    findPlaceholderSource([{ ...base, id: 4, name: "Wildcat MLA 2024" }])?.id,
  ).toBe(4)
  expect(findPlaceholderSource(undefined)).toBeUndefined()
})

it("suggests the next version number", () => {
  expect(nextCustomMlaVersion([])).toBe("1")
  expect(nextCustomMlaVersion([{ version: "1" }, { version: "4" }])).toBe("5")
  expect(nextCustomMlaVersion([{ version: "v1" }, { version: "v2" }])).toBe("3")
})

it("downloads the agreement as shown, placeholders in brackets, as a PDF", () => {
  openForLemon()
  edit(
    "admin.customMla.textTitle",
    dummyCustomMla.plaintext.replace("England and Wales", "Singapore"),
  )
  fireEvent.click(screen.getByText("admin.customMla.downloadPdf"))
  const [[{ html, fileName }]] = downloadPdf.mock.calls
  expect(fileName).toBe("Lemon Ltd MLA 3.pdf")
  expect(html).toContain("the laws of Singapore")
  expect(html).toContain("Interest accrues at [Annual Interest Rate] a year")
  expect(html).not.toContain("{{")
})
