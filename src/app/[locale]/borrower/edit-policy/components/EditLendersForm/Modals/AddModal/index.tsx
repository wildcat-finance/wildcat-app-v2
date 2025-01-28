import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Button, Dialog, TextField, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import {
  EditLenderFlowStatuses,
  MarketTableDataType,
} from "@/app/[locale]/borrower/edit-lenders-list/interface"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setPolicyLendersTableData } from "@/store/slices/editPolicySlice/editPolicySlice"
import { COLORS } from "@/theme/colors"

import { useAddLenderForm } from "./useAddLenderForm"

export const AddModal = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const lendersTableData = useAppSelector(
    (state) => state.editPolicy.lendersTableData,
  )
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMarkets, setSelectedMarkets] = useState<MarketTableDataType[]>(
    [],
  )
  const [isDisabled, setIsDisabled] = useState(false)

  const lendersNames: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const existingLenders = lendersTableData.map((lender) => lender.address)

  const {
    getValues,
    setValue,
    watch,
    register,
    formState: { errors, isValid },
    reset,
  } = useAddLenderForm(existingLenders)

  const addressValue = watch("address")

  const existingLender = existingLenders.find(
    (lender) => lender.toLowerCase() === addressValue?.toLowerCase(),
  )

  useEffect(() => {
    if (existingLender) {
      setIsDisabled(true)
      const storedName = lendersNames[existingLender.toLowerCase()]

      if (storedName) {
        setValue("name", storedName)
      }
    } else {
      setIsDisabled(false)
      reset({ name: "" })
    }
  }, [existingLender, lendersNames, reset, setValue])

  const handleOpen = () => {
    reset()
    setSelectedMarkets([])
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const onSubmitLender = () => {
    dispatch(
      setPolicyLendersTableData([
        ...lendersTableData,
        {
          id: getValues("address"),
          address: getValues("address").toLowerCase(),
          status: EditLenderFlowStatuses.NEW,
          credentialExpiry: 0,
          credentialSource: "",
          activeMarkets: selectedMarkets,
        },
      ]),
    )

    if (getValues("name") === "") {
      delete lendersNames[getValues("address").toLowerCase()]
    } else {
      lendersNames[getValues("address").toLowerCase()] = getValues("name")
      localStorage.setItem("lenders-name", JSON.stringify(lendersNames))
    }

    setIsOpen(false)
  }

  /*
  const onSubmitMarket = () => {
    dispatch(
      setPolicyLendersTableData(
        lendersTableData.map((lender) =>
          lender.address.toLowerCase() === getValues("address").toLowerCase()
            ? {
                ...lender,
              }
            : lender,
        ),
      ),
    )

    if (getValues("name") === "") {
      delete lendersNames[getValues("address").toLowerCase()]
    } else {
      lendersNames[getValues("address").toLowerCase()] = getValues("name")
      localStorage.setItem("lenders-name", JSON.stringify(lendersNames))
    }

    setIsOpen(false)
  }
  */

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="contained"
        color="secondary"
        size="small"
        sx={{
          height: "32px",
          fontSize: "13px",
          lineHeight: "16px",
          fontWeight: 600,
        }}
      >
        {t("editLendersList.modals.add.addLender")}
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleClose}
        sx={{
          "& .MuiDialog-paper": {
            minHeight: "404px",
            width: "440px",
            border: "none",
            borderRadius: "20px",
            margin: 0,
            padding: "24px 0",
          },
        }}
      >
        <TxModalHeader
          title="Add a new lender"
          crossOnClick={null}
          arrowOnClick={handleClose}
        />

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "8px 24px 0px 24px",
            marginBottom: "auto",
            width: "100%",
          }}
        >
          <TextField
            fullWidth
            size="medium"
            label="Wallet Address"
            {...register("address")}
            error={!!errors.address}
          />

          <TextField
            fullWidth
            size="medium"
            label={isDisabled ? "" : "Enter name"}
            {...register("name")}
            error={!!errors.name}
            disabled={isDisabled}
          />

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              maxWidth: "392px",
            }}
          >
            {errors.address && (
              <Box
                sx={{ display: "flex", alignItems: "flex-start", gap: "4px" }}
              >
                <Box
                  sx={{
                    width: "3px",
                    height: "3px",
                    marginTop: "6.5px",
                    backgroundColor: COLORS.wildWatermelon,
                    borderRadius: "50%",
                  }}
                />
                <Typography variant="text4" color={COLORS.wildWatermelon}>
                  {errors.address?.message}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Button
          onClick={onSubmitLender}
          disabled={!isValid}
          variant="contained"
          size="large"
          type="submit"
          sx={{ margin: "24px 24px 0" }}
        >
          {t("editLendersList.modals.add.add")}
        </Button>
      </Dialog>
    </>
  )
}
