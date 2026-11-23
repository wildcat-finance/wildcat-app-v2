import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export type LenderKycDialogSliceType = {
  open: boolean
}

const initialState: LenderKycDialogSliceType = {
  open: false,
}

const lenderKycDialogSlice = createSlice({
  name: "lenderKycDialog",
  initialState,
  reducers: {
    setLenderKycDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.open = action.payload
    },
  },
})

export const { setLenderKycDialogOpen } = lenderKycDialogSlice.actions

export default lenderKycDialogSlice.reducer
