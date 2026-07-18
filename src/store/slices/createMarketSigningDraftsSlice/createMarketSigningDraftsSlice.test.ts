import {
  createMarketSigningDraftsReducer,
  getCreateMarketSigningDraftScope,
  removeCreateMarketSigningDraft,
  saveCreateMarketSigningDraft,
} from "./createMarketSigningDraftsSlice"

const draft = {
  version: 1 as const,
  walletKind: "Safe" as const,
  id: "draft-1",
  chainId: 1,
  address: "0xABC",
  salt: "0xsalt",
  timeSigned: 123,
  formValues: { mla: "noMLA" } as never,
  borrowerProfile: {
    chainId: 1,
    address: "0xABC",
    registeredOnChain: true,
  },
  asset: {
    chainId: 1,
    address: "0xasset",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    isMock: false,
  },
  createdAt: 456,
}

describe("createMarketSigningDraftsSlice", () => {
  it("scopes drafts by normalized wallet and chain", () => {
    expect(getCreateMarketSigningDraftScope("0xABC", 1)).toBe("1:0xabc")
    expect(getCreateMarketSigningDraftScope("0xABC", 11155111)).toBe(
      "11155111:0xabc",
    )
  })

  it("saves, replaces, and removes the scoped draft", () => {
    let state = createMarketSigningDraftsReducer(
      undefined,
      saveCreateMarketSigningDraft(draft),
    )
    expect(state.records["1:0xabc"]).toEqual(draft)

    state = createMarketSigningDraftsReducer(
      state,
      saveCreateMarketSigningDraft({ ...draft, id: "draft-2" }),
    )
    expect(state.records["1:0xabc"].id).toBe("draft-2")

    state = createMarketSigningDraftsReducer(
      state,
      removeCreateMarketSigningDraft({ address: "0xabc", chainId: 1 }),
    )
    expect(state.records).toEqual({})
  })
})
