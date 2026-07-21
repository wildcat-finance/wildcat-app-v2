import {
  createMarketSigningDraftsReducer,
  getCreateMarketSigningDraftScope,
  markCreateMarketDraftDeployed,
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

  it("records the deployed market only on the draft with the matching salt", () => {
    let state = createMarketSigningDraftsReducer(
      undefined,
      saveCreateMarketSigningDraft(draft),
    )

    // A deploy result for a different (rotated) salt must never attach.
    state = createMarketSigningDraftsReducer(
      state,
      markCreateMarketDraftDeployed({
        address: "0xABC",
        chainId: 1,
        salt: "0xrotated",
        deployedMarket: "0xmarket",
      }),
    )
    expect(state.records["1:0xabc"].deployedMarket).toBeUndefined()

    state = createMarketSigningDraftsReducer(
      state,
      markCreateMarketDraftDeployed({
        address: "0xABC",
        chainId: 1,
        salt: "0xsalt",
        deployedMarket: "0xmarket",
      }),
    )
    expect(state.records["1:0xabc"].deployedMarket).toBe("0xmarket")

    // Missing record (EOA flow, no draft) is a no-op rather than a throw.
    const untouched = createMarketSigningDraftsReducer(
      undefined,
      markCreateMarketDraftDeployed({
        address: "0xother",
        chainId: 1,
        salt: "0xsalt",
        deployedMarket: "0xmarket",
      }),
    )
    expect(untouched.records).toEqual({})
  })
})
