import { createSlice } from "@reduxjs/toolkit"

export type TouModalSliceType = {
  // True while the ToU status/re-acceptance modal has been opened manually
  // (footer / mobile menu). Bypasses the session dismissal without erasing it.
  forcedOpen: boolean
}

const initialState: TouModalSliceType = {
  forcedOpen: false,
}

const touModalSlice = createSlice({
  name: "touModal",
  initialState,
  reducers: {
    setTouModalOpen: (state, action) => {
      state.forcedOpen = action.payload
    },
  },
})

export const { setTouModalOpen } = touModalSlice.actions

export default touModalSlice.reducer
