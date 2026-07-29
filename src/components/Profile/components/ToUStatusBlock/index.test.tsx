// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen } from "@testing-library/react"

import { ServiceAgreementStatusResponse } from "@/app/api/service-agreement/interface"

import { ToUStatusBlock } from "./index"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock("@/hooks/useMobileResolution", () => ({
  useMobileResolution: () => false,
}))

jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: () => ({ chainId: 1 }),
}))

const status: ServiceAgreementStatusResponse = {
  current: {
    version: "2.5",
    plaintextSha256: "current-hash",
    effectiveDate: "2026-07-01T00:00:00.000Z",
    reacceptanceDeadline: null,
  },
  accepted: {
    version: "2.4",
    plaintextSha256: "accepted-hash",
    legacyWrapperHash: "legacy-hash",
    organizationName: "Example Borrower",
    acceptedAt: Date.parse("2026-07-02T03:04:00.000Z"),
  },
}

describe("ToUStatusBlock", () => {
  it("uses the viewed profile chain for certificate downloads", () => {
    const open = jest.spyOn(window, "open").mockImplementation(() => null)

    render(
      <ToUStatusBlock
        address="0xAbCd"
        status={status}
        isLoading={false}
        externalChainId={11155111}
      />,
    )

    fireEvent.click(
      screen.getByRole("button", {
        name: "borrowerProfile.profile.touStatus.download",
      }),
    )

    expect(open).toHaveBeenCalledWith(
      "/api/service-agreement/0xabcd/certificate?chainId=11155111",
      "_blank",
    )

    open.mockRestore()
  })

  it("does not offer a certificate without an acceptance", () => {
    render(
      <ToUStatusBlock
        address="0xAbCd"
        status={{ ...status, accepted: null }}
        isLoading={false}
        externalChainId={11155111}
      />,
    )

    expect(
      screen.getByText("borrowerProfile.profile.touStatus.notAccepted"),
    ).toBeTruthy()
    expect(
      screen.queryByRole("button", {
        name: "borrowerProfile.profile.touStatus.download",
      }),
    ).toBeNull()
  })
})
