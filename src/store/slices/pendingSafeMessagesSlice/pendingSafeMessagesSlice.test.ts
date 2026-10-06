import {
  addPendingSafeMessage,
  markSafeMessageSignatureReady,
  markSafeMessageSubmitting,
  markSafeMessageSubmissionFailed,
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
})
