import { createSlice } from "@reduxjs/toolkit"

export type CookieBannerSliceType = {
  isVisible: boolean
}

const initialState: CookieBannerSliceType = {
  isVisible: false,
}

const cookieBannerSlice = createSlice({
  name: "cookieBanner",
  initialState,
  reducers: {
    setIsVisible: (state, action) => {
      state.isVisible = action.payload
    },
  },
})

export const { setIsVisible } = cookieBannerSlice.actions

export default cookieBannerSlice.reducer
