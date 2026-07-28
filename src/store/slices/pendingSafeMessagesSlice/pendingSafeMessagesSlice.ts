import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { createMigrate, persistReducer } from "redux-persist"
import type { PersistedState } from "redux-persist"
import storage from "redux-persist/lib/storage"

export type SafeMessageFlow =
  | "login"
  | "initial-tou"
  | "tou-accept"
  | "tou-decline"
  | "invitation-accept"
  | "borrower-market-mla"
  | "borrower-mla"
  | "borrower-mla-decline"
  | "lender-mla"
  | "non-mla-acknowledgement"

export type PendingSafeMessageStatus =
  | "awaitingConfirmations"
  | "signatureReady"
  | "submitting"
  | "failed"

export type PendingSafeMessage = {
  id: string
  flow: SafeMessageFlow
  address: string
  chainId: number
  message: string
  timeSigned: number
  kind: "offchain" | "onchain"
  messageHash?: string
  safeTxHash?: string
  status: PendingSafeMessageStatus
  signature?: string
  createdAt: number
  expiresAt?: number
  context?: Record<string, string | number | boolean>
  lastPolledAt?: number
  lastError?: string
}

export type PendingSafeMessagesState = {
  records: Record<string, PendingSafeMessage>
}

const initialState: PendingSafeMessagesState = { records: {} }

const pendingSafeMessagesSlice = createSlice({
  name: "pendingSafeMessages",
  initialState,
  reducers: {
    addPendingSafeMessage: (
      state,
      action: PayloadAction<PendingSafeMessage>,
    ) => {
      state.records[action.payload.id] = action.payload
    },
    markSafeMessageSignatureReady: (
      state,
      action: PayloadAction<{ id: string; signature: string }>,
    ) => {
      const record = state.records[action.payload.id]
      if (!record) return
      record.status = "signatureReady"
      record.signature = action.payload.signature
      record.lastPolledAt = Date.now()
      delete record.lastError
    },
    markSafeMessageSubmitting: (state, action: PayloadAction<string>) => {
      const record = state.records[action.payload]
      if (!record?.signature) return
      record.status = "submitting"
      delete record.lastError
    },
    markSafeMessageSubmissionFailed: (
      state,
      action: PayloadAction<{ id: string; error: string }>,
    ) => {
      const record = state.records[action.payload.id]
      if (!record) return
      record.status = record.signature ? "signatureReady" : record.status
      record.lastError = action.payload.error
    },
    markSafeMessagePollError: (
      state,
      action: PayloadAction<{ id: string; error: string }>,
    ) => {
      const record = state.records[action.payload.id]
      if (!record) return
      record.lastPolledAt = Date.now()
      record.lastError = action.payload.error
    },
    markSafeMessageFailed: (
      state,
      action: PayloadAction<{ id: string; error: string }>,
    ) => {
      const record = state.records[action.payload.id]
      if (!record) return
      record.status = "failed"
      record.lastPolledAt = Date.now()
      record.lastError = action.payload.error
    },
    removePendingSafeMessage: (state, action: PayloadAction<string>) => {
      delete state.records[action.payload]
    },
  },
})

export const {
  addPendingSafeMessage,
  markSafeMessageSignatureReady,
  markSafeMessageSubmitting,
  markSafeMessageSubmissionFailed,
  markSafeMessagePollError,
  markSafeMessageFailed,
  removePendingSafeMessage,
} = pendingSafeMessagesSlice.actions
export const pendingSafeMessagesReducer = pendingSafeMessagesSlice.reducer

export const discardLegacyCreateMarketSafeMessages = (
  state: PersistedState,
): PersistedState => {
  if (!state) return state

  const pendingState = state as unknown as PendingSafeMessagesState &
    NonNullable<PersistedState>
  return {
    records: Object.fromEntries(
      Object.entries(pendingState.records).filter(
        ([, record]) =>
          record.flow !== "borrower-market-mla" ||
          record.context?.draftVersion === 2,
      ),
    ),
    // eslint-disable-next-line no-underscore-dangle
    _persist: pendingState._persist,
  } as unknown as PersistedState
}

export default persistReducer(
  {
    key: "pendingSafeMessages",
    storage,
    version: 2,
    migrate: createMigrate(
      {
        2: discardLegacyCreateMarketSafeMessages,
      },
      { debug: false },
    ),
  },
  pendingSafeMessagesReducer,
)
