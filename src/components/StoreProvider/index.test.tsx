/* eslint-disable import/no-extraneous-dependencies, @typescript-eslint/no-var-requires, global-require */
import { act, waitFor } from "@testing-library/react"
import { hydrateRoot } from "react-dom/client"

import { NETWORKS } from "@/config/network"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"

import StoreProvider from "."

const { renderToString } =
  require("react-dom/server.node") as typeof import("react-dom/server")

const persistedNetwork = (network: (typeof NETWORKS)[keyof typeof NETWORKS]) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(network).map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]),
    ),
  )

const SelectedNetworkName = () => {
  const network = useSelectedNetwork()
  return <span data-testid="network-name">{network.name}</span>
}

describe("StoreProvider", () => {
  it("rehydrates persisted network state only after matching hydration", async () => {
    localStorage.setItem(
      "persist:selectedNetwork",
      persistedNetwork(NETWORKS.Sepolia),
    )
    const tree = (
      <StoreProvider>
        <SelectedNetworkName />
      </StoreProvider>
    )

    // React Redux intentionally uses a layout effect in the browser; its
    // development server renderer emits a warning even though it is not part
    // of the rendered markup or hydration contract under test.
    const consoleError = jest.spyOn(console, "error").mockImplementation()
    const serverMarkup = renderToString(tree)
    consoleError.mockRestore()
    expect(serverMarkup).toContain(NETWORKS.Mainnet.name)
    expect(serverMarkup).not.toContain(NETWORKS.Sepolia.name)

    const container = document.createElement("div")
    container.innerHTML = serverMarkup
    document.body.appendChild(container)
    const onRecoverableError = jest.fn()

    let root: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, tree, { onRecoverableError })
    })

    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="network-name"]')?.textContent,
      ).toBe(NETWORKS.Sepolia.name)
    })
    expect(onRecoverableError).not.toHaveBeenCalled()

    act(() => root.unmount())
    container.remove()
    localStorage.clear()
  })
})
