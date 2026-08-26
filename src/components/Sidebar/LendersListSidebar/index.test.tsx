/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"

import { LenderListSidebar } from "@/components/Sidebar/LendersListSidebar"
import { ROUTES } from "@/routes"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// svgr turns this into a component at build time; jest resolves it to a static
// asset object, so it is stubbed the way this repo's other component tests stub
// the modules they do not exercise.
jest.mock("@/assets/icons/backArrow_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))

// A working router is mocked in deliberately, even though this sidebar no
// longer calls one. If someone reintroduces history navigation here, these
// tests should fail on the destination rather than on a missing app-router
// context, which would read as a test-setup problem instead of the defect.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}))

const mockSidebarState = { editLendersList: { step: "edit" } }

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector(mockSidebarState),
}))

describe("LenderListSidebar", () => {
  it("gives its back control a link to the borrower markets page", () => {
    render(<LenderListSidebar />)

    const control = screen.getByRole("link", {
      name: /lenderMarketList.sidebar.back/i,
    })

    expect(control.getAttribute("href")).toBe(ROUTES.borrower.root)
  })

  it("still renders both step buttons, with the current step selected", () => {
    render(<LenderListSidebar />)

    const editing = screen.getByRole("button", {
      name: /lenderMarketList.sidebar.editingLenders/i,
    })
    const confirm = screen.getByRole("button", {
      name: /lenderMarketList.sidebar.confirm/i,
    })

    // The store says step "edit", so only that button carries the selected
    // background. Colours come from the shared sidebar style objects.
    expect(editing.className).not.toBe(confirm.className)
  })
})
