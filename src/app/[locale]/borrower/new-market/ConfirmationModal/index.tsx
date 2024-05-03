"use client"

import { useState } from "react"

import {
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import { ConfirmationFormItem } from "@/app/[locale]/borrower/new-market/ConfirmationModal/ConfirmationFormItem"
import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"

import {
  BackArrowButton,
  ButtonContainer,
  ButtonStyle,
  ConfirmButton,
  CrossButton,
  DialogContainer,
  DividerStyle,
  FooterModalContainer,
  FormModalContainer,
  FormModalGroupContainer,
  Gradient,
  HeaderModalContainer,
  MLAButton,
  MLATitle,
  Note,
} from "./style"

export const ConfirmationModal = () => {
  const [open, setOpen] = useState(false)

  const handleToggleModal = () => {
    setOpen(!open)
  }

  return (
    <>
      <Button
        size="large"
        variant="contained"
        sx={ConfirmButton}
        onClick={handleToggleModal}
      >
        Confirm
      </Button>

      <Dialog open={open} onClose={handleToggleModal} sx={DialogContainer}>
        <Box sx={HeaderModalContainer}>
          <IconButton onClick={handleToggleModal}>
            <SvgIcon fontSize="big" sx={BackArrowButton}>
              <BackArrow />
            </SvgIcon>
          </IconButton>

          <Typography variant="title3">
            Review your new market’s details
          </Typography>

          <IconButton onClick={handleToggleModal}>
            <SvgIcon fontSize="big" sx={CrossButton}>
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>

        <Box sx={FormModalContainer}>
          <Typography variant="text3">DEFINITION</Typography>

          <Box sx={FormModalGroupContainer}>
            <ConfirmationFormItem label="Market Name" value="" />
            <ConfirmationFormItem label="Underlying asset" value="" />
            <ConfirmationFormItem label="Market Type" value="" />
            <ConfirmationFormItem label="Market token name" value="" />
            <ConfirmationFormItem label="Market token symbol" value="" />
            <Box display="flex" flexDirection="column" rowGap="6px">
              <Typography variant="text3" sx={MLATitle}>
                Market Master Loan Agreement
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                sx={MLAButton}
              >
                View MLA
              </Button>
            </Box>
          </Box>

          <Divider sx={DividerStyle} />

          <Typography variant="text3">AMOUNT AND DUTIES</Typography>

          <Box sx={FormModalGroupContainer}>
            <ConfirmationFormItem label="Max. Borrowing Capacity" value="" />
            <ConfirmationFormItem label="Base APR" value="" />
            <ConfirmationFormItem label="Penalty APR" value="" />
            <ConfirmationFormItem label="Reserve Ratio" value="" />
          </Box>

          <Divider sx={DividerStyle} />

          <Typography variant="text3">GRACE AND WITHDRAWALS</Typography>

          <Box sx={FormModalGroupContainer}>
            <ConfirmationFormItem label="Grace period" value="" />
            <ConfirmationFormItem label="Withdrawal cycle length" value="" />
          </Box>

          <Divider sx={DividerStyle} />

          <Typography variant="text3">BORROWER INFO</Typography>

          <Box sx={FormModalGroupContainer} marginBottom="30px">
            <ConfirmationFormItem
              label="Legal Name and Jurisdiction"
              value=""
            />
            <ConfirmationFormItem label="Address" value="" />
            <ConfirmationFormItem label="Email" value="" />
          </Box>
        </Box>

        <Box sx={Gradient} />

        <Box sx={FooterModalContainer}>
          <Box sx={ButtonContainer}>
            <Button size="large" variant="contained" sx={ButtonStyle}>
              Sign MLA
            </Button>
            <Button size="large" variant="contained" sx={ButtonStyle}>
              Deploy Market
            </Button>
          </Box>
          <Typography variant="text3" sx={Note}>
            Note that once your market is created, the only adjustable
            parameters will be base APR and maximum capacity.
          </Typography>
        </Box>
      </Dialog>
    </>
  )
}
