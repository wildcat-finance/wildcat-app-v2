import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export type HideMarketSectionsType = {
  description: boolean
}

const initialState: HideMarketSectionsType = {
  description: false,
}

const hideMarketSectionsSlice = createSlice({
  name: "hideMarketSections",
  initialState,
  reducers: {
    hideDescriptionSection: (state, action: PayloadAction<boolean>) => {
      state.description = action.payload
    },
  },
})

export const { hideDescriptionSection } = hideMarketSectionsSlice.actions

export default hideMarketSectionsSlice.reducer
