/* eslint-disable import/no-extraneous-dependencies */
import { ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useAccount, useConnect } from "wagmi"

import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { signSafeOwnerLogin } from "@/lib/safeOwnerLogin"

import {
  SafeOwnerLoginProvider,
  useSafeOwnerLogin,
} from "./SafeOwnerLoginProvider"

jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
  useConnect: jest.fn(),
  WagmiProvider: ({ children }: { children: ReactNode }) => children,
}))
jest.mock("@/hooks/useSelectedNetwork", () => ({
  useSelectedNetwork: jest.fn(),
}))
jest.mock("@/lib/ownerWalletConfig", () => ({
  getOwnerWalletConfig: () => ({}),
}))
jest.mock("@/lib/safeOwnerLogin", () => ({ signSafeOwnerLogin: jest.fn() }))

const address = "0xc15be5214978d1fc509ecdd4f9d5bc067c94d9ae"
const scope = { address, chainId: 9745 }
const signed = { signature: "0xowner", timeSigned: 123 }
const connector = {
  id: "test-owner",
  uid: "owner",
  name: "Owner wallet",
  type: "injected",
}
const connectAsync = jest.fn()
const onSigned = jest.fn()
const onError = jest.fn()
let queryClient: QueryClient

function LoginButton() {
  const login = useSafeOwnerLogin()
  return (
    <button
      onClick={() => {
        login(scope).then(onSigned, onError)
      }}
    >
      Login
    </button>
  )
}

const tree = () => (
  <QueryClientProvider client={queryClient}>
    <SafeOwnerLoginProvider>
      <LoginButton />
    </SafeOwnerLoginProvider>
  </QueryClientProvider>
)

beforeEach(() => {
  jest.resetAllMocks()
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  jest
    .mocked(useAccount)
    .mockReturnValue({ ...scope } as unknown as ReturnType<typeof useAccount>)
  jest
    .mocked(useSelectedNetwork)
    .mockReturnValue({ chainId: 9745 } as ReturnType<typeof useSelectedNetwork>)
  jest.mocked(useConnect).mockReturnValue({
    connectors: [connector],
    connectAsync,
  } as unknown as ReturnType<typeof useConnect>)
  connectAsync.mockResolvedValue({})
  jest.mocked(signSafeOwnerLogin).mockResolvedValue(signed)
})

afterEach(() => {
  queryClient.clear()
})

it("connects the selected owner wallet, signs and closes the dialog", async () => {
  render(tree())
  fireEvent.click(screen.getByText("Login"))
  fireEvent.click(screen.getByText("Owner wallet"))
  await waitFor(() => expect(onSigned).toHaveBeenCalledWith(signed))
  expect(connectAsync).toHaveBeenCalledWith({ connector, chainId: 9745 })
  expect(screen.queryByRole("dialog")).toBeNull()
})

it("shows wallet errors and allows retry inside the dialog", async () => {
  jest
    .mocked(signSafeOwnerLogin)
    .mockRejectedValueOnce(new Error("User rejected signature"))
  render(tree())
  fireEvent.click(screen.getByText("Login"))
  fireEvent.click(screen.getByText("Owner wallet"))
  await screen.findByText("User rejected signature")
  expect(onSigned).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText("Owner wallet"))
  await waitFor(() => expect(onSigned).toHaveBeenCalledWith(signed))
})

it("does not prompt for a signature after cancelling a pending wallet connection", async () => {
  let completeConnect: () => void
  connectAsync.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      completeConnect = resolve
    }),
  )
  render(tree())
  fireEvent.click(screen.getByText("Login"))
  fireEvent.click(screen.getByText("Owner wallet"))
  await waitFor(() => expect(connectAsync).toHaveBeenCalled())
  fireEvent.click(screen.getByText("Cancel"))
  await waitFor(() =>
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Login cancelled" }),
    ),
  )
  await act(async () => {
    completeConnect!()
  })
  expect(signSafeOwnerLogin).not.toHaveBeenCalled()
  expect(onSigned).not.toHaveBeenCalled()
})

it.each(["account", "network", "unmount"])(
  "closes WalletConnect when login is cancelled by %s",
  async (change) => {
    let rejectPairing: (error: Error) => void
    const closeModal = jest.fn(() => rejectPairing(new Error("Pairing closed")))
    const walletConnect = {
      ...connector,
      type: "walletConnect",
      name: "WalletConnect",
      getProvider: async () => ({ modal: { closeModal } }),
    }
    jest.mocked(useConnect).mockReturnValue({
      connectors: [walletConnect],
      connectAsync,
    } as unknown as ReturnType<typeof useConnect>)
    connectAsync.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectPairing = reject
      }),
    )
    const { rerender, unmount } = render(tree())
    fireEvent.click(screen.getByText("Login"))
    fireEvent.click(screen.getByText("WalletConnect"))
    await waitFor(() => expect(connectAsync).toHaveBeenCalled())
    if (change === "unmount") unmount()
    else {
      if (change === "account")
        jest.mocked(useAccount).mockReturnValue({
          address: "0xother",
          chainId: 9745,
        } as unknown as ReturnType<typeof useAccount>)
      else
        jest
          .mocked(useSelectedNetwork)
          .mockReturnValue({ chainId: 1 } as ReturnType<
            typeof useSelectedNetwork
          >)
      rerender(tree())
    }
    await waitFor(() => expect(closeModal).toHaveBeenCalledTimes(1))
    expect(signSafeOwnerLogin).not.toHaveBeenCalled()
    expect(onSigned).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Login cancelled" }),
    )
  },
)

it("does not start WalletConnect pairing if cancelled while its provider initializes", async () => {
  let finishProvider: (provider: { modal: { closeModal: () => void } }) => void
  const closeModal = jest.fn()
  const getProvider = jest.fn(
    () =>
      new Promise((resolve) => {
        finishProvider = resolve
      }),
  )
  const walletConnect = {
    ...connector,
    type: "walletConnect",
    name: "WalletConnect",
    getProvider,
  }
  jest.mocked(useConnect).mockReturnValue({
    connectors: [walletConnect],
    connectAsync,
  } as unknown as ReturnType<typeof useConnect>)
  render(tree())
  fireEvent.click(screen.getByText("Login"))
  fireEvent.click(screen.getByText("WalletConnect"))
  await waitFor(() => expect(getProvider).toHaveBeenCalled())
  fireEvent.click(screen.getByText("Cancel"))
  await act(async () => {
    finishProvider!({ modal: { closeModal } })
  })
  expect(connectAsync).not.toHaveBeenCalled()
  expect(signSafeOwnerLogin).not.toHaveBeenCalled()
  expect(closeModal).not.toHaveBeenCalled()
})

it("ignores a late signature from a dismissed dialog after starting another login", async () => {
  let completeSign: (value: typeof signed) => void
  jest.mocked(signSafeOwnerLogin).mockReturnValueOnce(
    new Promise((resolve) => {
      completeSign = resolve
    }),
  )
  render(tree())
  fireEvent.click(screen.getByText("Login"))
  fireEvent.click(screen.getByText("Owner wallet"))
  await waitFor(() => expect(signSafeOwnerLogin).toHaveBeenCalled())
  fireEvent.click(screen.getByText("Cancel"))
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  fireEvent.click(screen.getByText("Login"))
  await act(async () => {
    completeSign!(signed)
  })
  expect(onSigned).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText("Owner wallet"))
  await waitFor(() => expect(onSigned).toHaveBeenCalledTimes(1))
})

it.each(["account", "network"])(
  "cancels when the primary %s changes",
  async (change) => {
    const { rerender } = render(tree())
    fireEvent.click(screen.getByText("Login"))
    if (change === "account")
      jest.mocked(useAccount).mockReturnValue({
        address: "0xother",
        chainId: 9745,
      } as unknown as ReturnType<typeof useAccount>)
    else
      jest
        .mocked(useSelectedNetwork)
        .mockReturnValue({ chainId: 1 } as ReturnType<
          typeof useSelectedNetwork
        >)
    rerender(tree())
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Login cancelled" }),
      ),
    )
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(onSigned).not.toHaveBeenCalled()
  },
)
