/* eslint-disable import/no-extraneous-dependencies, @typescript-eslint/no-var-requires, global-require */
import { act } from "@testing-library/react"
import { hydrateRoot } from "react-dom/client"

import { useMobileResolution } from "./useMobileResolution"

const { renderToString } =
  require("react-dom/server.node") as typeof import("react-dom/server")

describe("useMobileResolution", () => {
  it("hydrates the desktop server snapshot before sharing one mobile listener", async () => {
    const addEventListener = jest.fn()
    const removeEventListener = jest.fn()
    window.matchMedia = jest.fn().mockReturnValue({
      matches: true,
      media: "(max-width: 999.95px)",
      onchange: null,
      addEventListener,
      removeEventListener,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })

    const Consumer = ({ id }: { id: string }) => {
      const isMobile = useMobileResolution()
      return <span data-testid={id}>{isMobile ? "mobile" : "desktop"}</span>
    }
    const consumers = (
      <>
        <Consumer id="first" />
        <Consumer id="second" />
      </>
    )

    const serverMarkup = renderToString(consumers)
    expect(serverMarkup).toContain("desktop")
    expect(window.matchMedia).not.toHaveBeenCalled()

    const container = document.createElement("div")
    container.innerHTML = serverMarkup
    document.body.appendChild(container)
    const onRecoverableError = jest.fn()

    let root: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, consumers, { onRecoverableError })
    })

    expect(container.querySelector('[data-testid="first"]')?.textContent).toBe(
      "mobile",
    )
    expect(container.querySelector('[data-testid="second"]')?.textContent).toBe(
      "mobile",
    )
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(window.matchMedia).toHaveBeenCalledTimes(1)
    expect(addEventListener).toHaveBeenCalledTimes(1)

    act(() => root.unmount())
    expect(removeEventListener).toHaveBeenCalledTimes(1)
    container.remove()
  })
})
