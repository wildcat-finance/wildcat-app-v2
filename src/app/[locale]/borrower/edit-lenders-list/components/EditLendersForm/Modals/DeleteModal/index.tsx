import { Dispatch, SetStateAction } from "react"

import { Box, Button, Dialog, SvgIcon, Typography } from "@mui/material"

import CircledAlert from "@/assets/icons/circledAlert_icon.svg"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setLendersTableData } from "@/store/slices/editLendersListSlice/editLendersListSlice"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export type DeleteModalProps = {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  lenderAddress: string
}

export const DeleteModal = ({
  isOpen,
  setIsOpen,
  lenderAddress,
}: DeleteModalProps) => {
  const dispatch = useAppDispatch()

  const lendersTableData = useAppSelector(
    (state) => state.editLendersList.lendersTableData,
  )

  const lendersNames: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const lenderName =
    lendersNames[lenderAddress.toLowerCase()] ?? trimAddress(lenderAddress)

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleDelete = () => {
    dispatch(
      setLendersTableData(
        lendersTableData.filter((lender) => lender.address !== lenderAddress),
      ),
    )
    setIsOpen(false)
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      sx={{
        "& .MuiDialog-paper": {
          height: "400px",
          width: "440px",
          border: "none",
          borderRadius: "20px",
          margin: 0,
          padding: "24px",

          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        },
      }}
    >
      <Box sx={{ width: "100%", height: "32px" }} />

      <Box
        sx={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SvgIcon sx={{ fontSize: "24px" }}>
          <CircledAlert />
        </SvgIcon>

        <Typography variant="title3" sx={{ margin: "20px 0 8px" }}>
          Are you sure to remove {lenderName}?
        </Typography>

        <Typography
          variant="text2"
          color={COLORS.santasGrey}
          sx={{ width: "352px" }}
        >
          By removing all markets the lender is attached to you will remove the
          lender from the list
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: "8px" }}>
        <Button
          fullWidth
          size="large"
          variant="contained"
          color="secondary"
          onClick={handleClose}
        >
          Cancel
        </Button>

        <Button
          fullWidth
          size="large"
          variant="contained"
          onClick={handleDelete}
        >
          Delete
        </Button>
      </Box>
    </Dialog>
  )
}
