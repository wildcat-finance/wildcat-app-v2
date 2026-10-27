import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export type HideMarketSectionsType = {
  description: boolean
  /** Hidden until the market has published Glass Door analytics. */
  analytics: boolean
}

const initialState: HideMarketSectionsType = {
  description: false,
  analytics: true,
}

const hideMarketSectionsSlice = createSlice({
  name: "hideMarketSections",
  initialState,
  reducers: {
    hideDescriptionSection: (state, action: PayloadAction<boolean>) => {
      state.description = action.payload
    },
    hideAnalyticsSection: (state, action: PayloadAction<boolean>) => {
      state.analytics = action.payload
    },
  },
})

export const { hideDescriptionSection, hideAnalyticsSection } =
  hideMarketSectionsSlice.actions

export default hideMarketSectionsSlice.reducer
