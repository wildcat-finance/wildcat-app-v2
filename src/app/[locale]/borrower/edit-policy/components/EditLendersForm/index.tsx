import { ChangeEvent } from "react"
import * as React from "react"

import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Skeleton,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import { AddModal } from "@/app/[locale]/borrower/edit-policy/components/EditLendersForm/Modals/AddModal"
import useTrackPolicyLendersChanges from "@/app/[locale]/borrower/edit-policy/hooks/useTrackLendersChanges"
import Cross from "@/assets/icons/cross_icon.svg"
import Search from "@/assets/icons/search_icon.svg"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setEditStep,
  setPolicyLenderFilter,
} from "@/store/slices/editPolicySlice/editPolicySlice"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"

import { EditLendersTable } from "./EditLendersTable"

export type EditLendersFormProps = {
  isLoading: boolean
}

export const EditLendersForm = ({ isLoading }: EditLendersFormProps) => {
  const { t } = useTranslation()
  // Constants
  const dispatch = useAppDispatch()

  const initialLendersTableData = useAppSelector(
    (state) => state.editPolicy.initialLendersTableData,
  )
  const lendersTableData = useAppSelector(
    (state) => state.editPolicy.lendersTableData,
  )

  const noLenders = lendersTableData.length === 0

  // Functions
  const handleClickConfirm = () => {
    console.log("handleClickConfirm")
    dispatch(setEditStep("confirm"))
  }

  const lenderNameOrAddress = useAppSelector(
    (state) => state.editPolicy.lenderFilter,
  )

  const handleChangeLender = (evt: ChangeEvent<HTMLInputElement>) => {
    dispatch(setPolicyLenderFilter(evt.target.value))
  }

  const handleClickEraseLender = (evt: React.MouseEvent) => {
    evt.stopPropagation()
    dispatch(setPolicyLenderFilter(""))
  }

  // Check if there were any changes in Lenders List
  const { isLendersHaveChanges } = useTrackPolicyLendersChanges(
    initialLendersTableData,
    lendersTableData,
  )

  if (isLoading)
    return (
      <>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "30px",
          }}
        >
          <Skeleton
            sx={{ bgcolor: COLORS.athensGrey, borderRadius: "8px" }}
            width="320px"
            height="32px"
          />
          <Box display="flex" gap="6px">
            <Skeleton
              sx={{ bgcolor: COLORS.athensGrey }}
              width="109px"
              height="32px"
            />
            <Skeleton
              sx={{ bgcolor: COLORS.athensGrey }}
              width="69px"
              height="32px"
            />
          </Box>
        </Box>

        <Box
          display="flex"
          flexDirection="column"
          rowGap="8px"
          marginTop="20px"
        >
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
        </Box>
      </>
    )

  return (
    <Box height="calc(100% - 52px - 43px)">
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <TextField
          value={lenderNameOrAddress}
          onChange={handleChangeLender}
          size="small"
          placeholder="Search"
          sx={{
            width: "320px",
            marginRight: "6px",

            "& .MuiInputBase-root": {
              paddingRight: "8px",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SvgIcon
                  fontSize="small"
                  sx={{
                    width: "20px",
                    "& path": { fill: `${COLORS.greySuit}` },
                  }}
                >
                  <Search />
                </SvgIcon>
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleClickEraseLender}
                  disableRipple
                  sx={{
                    padding: "0 2px 0 0",
                    "& path": {
                      fill: `${COLORS.greySuit}`,
                      transition: "fill 0.2s",
                    },
                    "& :hover": {
                      "& path": { fill: `${COLORS.santasGrey}` },
                    },
                  }}
                >
                  <SvgIcon fontSize="small">
                    <Cross />
                  </SvgIcon>
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ display: "flex", gap: "6px" }}>
          <AddModal />

          <Button
            onClick={handleClickConfirm}
            disabled={!isLendersHaveChanges}
            variant="contained"
            size="small"
            sx={{
              height: "32px",
              width: "69px",
              fontSize: pxToRem(13),
              lineHeight: lh(16, 13),
              fontWeight: 600,
            }}
          >
            {t("editPolicy.forms.edit.submit")}
          </Button>
        </Box>
      </Box>

      {!noLenders && <EditLendersTable />}

      {noLenders && (
        <Box sx={{ height: "100%", display: "flex" }}>
          <Box
            sx={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <Typography variant="text3" color={COLORS.santasGrey}>
              {t("editPolicy.forms.edit.noLenders")}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  )
}
