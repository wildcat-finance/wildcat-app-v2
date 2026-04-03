import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { PolicyLenderTableDataType } from "@/app/[locale]/borrower/edit-policy/interface"
import { logger } from "@/lib/logging/client"
import { EditPolicyLendersListType } from "@/store/slices/editPolicySlice/interface"

const initialState: EditPolicyLendersListType = {
  lenderFilter: "",
  step: "edit",
  policyName: "",
  activeBorrowerMarkets: [],
  initialLendersTableData: [],
  lendersTableData: [],
}

const editPolicySlice = createSlice({
  name: "editPolicy",
  initialState,
  reducers: {
    setPolicyLenderFilter: (state, action: PayloadAction<string>) => {
      state.lenderFilter = action.payload
    },
    setEditStep: (state, action: PayloadAction<"edit" | "confirm">) => {
      logger.debug({ step: action.payload }, "Set edit step")
      state.step = action.payload
    },
    setPolicyName: (state, action: PayloadAction<string>) => {
      state.policyName = action.payload
    },
    setActivePolicyMarkets: (
      state,
      action: PayloadAction<{ name: string; address: string }[]>,
    ) => {
      state.activeBorrowerMarkets = action.payload
    },
    setInitialPolicyLendersTableData: (
      state,
      action: PayloadAction<PolicyLenderTableDataType[]>,
    ) => {
      state.initialLendersTableData = action.payload
    },
    setPolicyLendersTableData: (
      state,
      action: PayloadAction<PolicyLenderTableDataType[]>,
    ) => {
      state.lendersTableData = action.payload
    },
    resetPolicyName: (state) => {
      state.policyName = initialState.policyName
    },
    resetPolicyFilters: (state) => {
      state.lenderFilter = initialState.lenderFilter
    },
    resetPolicyRows: (state) => {
      state.lendersTableData = initialState.lendersTableData
    },
    resetEditPolicyState: () => initialState,
  },
})

export const {
  setPolicyLenderFilter,
  setEditStep,
  setActivePolicyMarkets,
  setInitialPolicyLendersTableData,
  setPolicyLendersTableData,
  resetPolicyFilters,
  resetPolicyRows,
  resetEditPolicyState,
} = editPolicySlice.actions

export default editPolicySlice.reducer
