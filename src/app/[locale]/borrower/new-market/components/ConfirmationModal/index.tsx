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

import { useLegalInfoForm } from "@/app/[locale]/borrower/new-market/hooks/useLegalInfoForm"
import { useNewMarketForm } from "@/app/[locale]/borrower/new-market/hooks/useNewMarketForm"
import Cross from "@/assets/icons/cross_icon.svg"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { STEPS_NAME } from "@/store/slices/routingSlice/flowsSteps"
import {
  setNextStep,
  setPreviousStep,
} from "@/store/slices/routingSlice/routingSlice"

import { ConfirmationFormItem } from "./ConfirmationFormItem"
import {
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

  const { getValues: getMarketValues } = useNewMarketForm()
  const { getValues: getInfoValues } = useLegalInfoForm()

  const dispatch = useAppDispatch()

  const hideLegalInfoStep = useAppSelector(
    (state) => state.routing.hideInfoStep,
  )

  const handleClickOpen = () => {
    setOpen(true)
    dispatch(setNextStep(STEPS_NAME.confirmation))
  }

  const handleClickClose = () => {
    setOpen(false)
    dispatch(
      setPreviousStep(
        hideLegalInfoStep
          ? STEPS_NAME.marketDescription
          : STEPS_NAME.legalInformation,
      ),
    )
  }

  return (
    <>
      <Button
        size="large"
        variant="contained"
        sx={ConfirmButton}
        onClick={handleClickOpen}
      >
        Confirm
      </Button>

      <Dialog open={open} onClose={handleClickClose} sx={DialogContainer}>
        <Box sx={HeaderModalContainer}>
          <Box width="20px" height="20px" />

          <Typography variant="title3">
            Review your new market’s details
          </Typography>

          <IconButton onClick={handleClickClose}>
            <SvgIcon fontSize="big" sx={CrossButton}>
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>

        <Box sx={FormModalContainer}>
          <Typography variant="text3">DEFINITION</Typography>

          <Box sx={FormModalGroupContainer}>
            <ConfirmationFormItem
              label="Market Name"
              value={getMarketValues("marketName")}
            />
            <ConfirmationFormItem
              label="Underlying asset"
              value={getMarketValues("asset")}
            />
            <ConfirmationFormItem
              label="Market Type"
              value={getMarketValues("marketType")}
            />
            <ConfirmationFormItem
              label="Market token name"
              value={getMarketValues("namePrefix")}
            />
            <ConfirmationFormItem
              label="Market token symbol"
              value={getMarketValues("symbolPrefix")}
            />
            {getMarketValues("mla") === "wildcatMLA" && (
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
            )}
          </Box>

          <Divider sx={DividerStyle} />

          <Typography variant="text3">AMOUNT AND DUTIES</Typography>

          <Box sx={FormModalGroupContainer}>
            <ConfirmationFormItem
              label="Max. Borrowing Capacity"
              value={getMarketValues("maxTotalSupply")}
            />
            <ConfirmationFormItem
              label="Base APR"
              value={getMarketValues("annualInterestBips")}
            />
            <ConfirmationFormItem
              label="Penalty APR"
              value={getMarketValues("delinquencyFeeBips")}
            />
            <ConfirmationFormItem
              label="Reserve Ratio"
              value={getMarketValues("reserveRatioBips")}
            />
          </Box>

          <Divider sx={DividerStyle} />

          <Typography variant="text3">GRACE AND WITHDRAWALS</Typography>

          <Box
            sx={FormModalGroupContainer}
            marginBottom={hideLegalInfoStep ? "30px" : ""}
          >
            <ConfirmationFormItem
              label="Grace period"
              value={getMarketValues("delinquencyGracePeriod")}
            />
            <ConfirmationFormItem
              label="Withdrawal cycle length"
              value={getMarketValues("withdrawalBatchDuration")}
            />
          </Box>

          {!hideLegalInfoStep && (
            <>
              <Divider sx={DividerStyle} />

              <Typography variant="text3">BORROWER INFO</Typography>

              <Box sx={FormModalGroupContainer} marginBottom="30px">
                <ConfirmationFormItem
                  label="Legal Name and Jurisdiction"
                  value={`${getInfoValues("legalName")} / ${getInfoValues(
                    "jurisdiction",
                  )}`}
                />
                <ConfirmationFormItem
                  label="Address"
                  value={getInfoValues("address")}
                />
                <ConfirmationFormItem
                  label="Email"
                  value={getInfoValues("email")}
                />
              </Box>
            </>
          )}
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
