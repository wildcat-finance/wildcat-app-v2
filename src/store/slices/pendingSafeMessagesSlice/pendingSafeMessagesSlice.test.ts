import {
  addPendingSafeMessage,
  discardLegacyCreateMarketSafeMessages,
  markSafeMessageSignatureReady,
  markSafeMessageSubmitting,
  markSafeMessageSubmissionFailed,
  migratePendingSafeMessages,
  pendingSafeMessagesReducer,
  PendingSafeMessage,
  removePendingSafeMessage,
} from "./pendingSafeMessagesSlice"

const pending: PendingSafeMessage = {
  id: "message",
  flow: "tou-accept",
  address: "0xabc",
  chainId: 1,
  message: "terms",
  timeSigned: 1,
  kind: "offchain",
  messageHash: "0xhash",
  status: "awaitingConfirmations",
  createdAt: 1,
  context: { reason: "Needs review" },
}

describe("pendingSafeMessagesSlice", () => {
  it.each([1, 2])(
    "upgrades version %s while preserving current agreement drafts and ready signatures",
    async (version) => {
      const agreement = {
        ...pending,
        status: "signatureReady",
        signature: "0xsigned",
      }
      const currentDraft = {
        ...pending,
        id: "current-draft",
        flow: "borrower-market-mla",
        context: { draftId: "current", draftVersion: 2 },
      }
      const persisted = {
        _persist: { version, rehydrated: true },
        records: {
          login: { ...pending, id: "login", flow: "login" },
          legacyDraft: {
            ...pending,
            id: "legacy-draft",
            flow: "borrower-market-mla",
            context: { draftId: "legacy" },
          },
          agreement,
          currentDraft,
        },
      }
      await expect(migratePendingSafeMessages(persisted, 3)).resolves.toEqual({
        ...persisted,
        records: { agreement, currentDraft },
      })
    },
  )

  it("retains a ready signature for retry until submission succeeds", () => {
    let state = pendingSafeMessagesReducer(
      undefined,
      addPendingSafeMessage(pending),
    )
    expect(state.records[pending.id].context).toEqual({
      reason: "Needs review",
    })
    state = pendingSafeMessagesReducer(
      state,
      markSafeMessageSignatureReady({ id: pending.id, signature: "0xsigned" }),
    )
    state = pendingSafeMessagesReducer(
      state,
      markSafeMessageSubmitting(pending.id),
    )
    state = pendingSafeMessagesReducer(
      state,
      markSafeMessageSubmissionFailed({
        id: pending.id,
        error: "network error",
      }),
    )

    expect(state.records[pending.id]).toMatchObject({
      status: "signatureReady",
      signature: "0xsigned",
      lastError: "network error",
    })

    state = pendingSafeMessagesReducer(
      state,
      removePendingSafeMessage(pending.id),
    )
    expect(state.records).toEqual({})
  })

  it("drops only pre-V2.5 create-market messages during persistence migration", () => {
    const legacyMarketMessage: PendingSafeMessage = {
      ...pending,
      id: "legacy-market",
      flow: "borrower-market-mla",
      context: { draftId: "v1-draft" },
    }
    const currentMarketMessage: PendingSafeMessage = {
      ...pending,
      id: "current-market",
      flow: "borrower-market-mla",
      context: { draftId: "v2-draft", draftVersion: 2 },
    }

    expect(
      discardLegacyCreateMarketSafeMessages({
        records: {
          [pending.id]: pending,
          [legacyMarketMessage.id]: legacyMarketMessage,
          [currentMarketMessage.id]: currentMarketMessage,
        },
        _persist: { version: 1, rehydrated: true },
      } as never),
    ).toEqual({
      records: {
        [pending.id]: pending,
        [currentMarketMessage.id]: currentMarketMessage,
      },
      _persist: { version: 1, rehydrated: true },
    })
  })
})
