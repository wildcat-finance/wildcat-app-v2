/* eslint-disable import/no-extraneous-dependencies */
import { renderHook } from "@testing-library/react"

import { useWagmiHydrated } from "./useWagmiHydrated"

const hasHydratedMock = jest.fn()
const onFinishHydrationMock = jest.fn(() => jest.fn())

jest.mock("wagmi", () => ({
  useConfig: () => ({
    _internal: {
      store: {
        persist: {
          hasHydrated: hasHydratedMock,
          onFinishHydration: onFinishHydrationMock,
        },
      },
    },
  }),
}))

describe("useWagmiHydrated", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each([false, true])(
    "returns the persisted-store hydration state",
    (state) => {
      hasHydratedMock.mockReturnValue(state)

      const { result } = renderHook(() => useWagmiHydrated())

      expect(result.current).toBe(state)
      expect(onFinishHydrationMock).toHaveBeenCalled()
    },
  )
})
