import { useState } from "react"

import { Box, Button, Divider, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { Token } from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
  FormContainer,
  SectionGrid,
} from "@/app/[locale]/borrower/create-market/components/Forms/style"
import { ConfirmationFormItem } from "@/app/[locale]/borrower/new-market/components/ConfirmationModal/ConfirmationFormItem"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/new-market/validation/validationSchema"
import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import {
  mockedAccessControlOptions,
  mockedMarketTypesOptions,
} from "@/mocks/mocks"
import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import { COLORS } from "@/theme/colors"
import { timestampToDateFormatted } from "@/utils/formatters"

export type ConfirmationFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>
  tokenAsset: Token | undefined
}

export const ConfirmationForm = ({
  form,
  tokenAsset,
}: ConfirmationFormProps) => {
  const { t } = useTranslation()

  const dispatch = useAppDispatch()

  const { getValues } = form

  const [signed, setSigned] = useState<boolean>(false)

  const marketTypeValue = mockedMarketTypesOptions.find(
    (el) => el.value === getValues("marketType"),
  )?.label

  const accessControlValue = mockedAccessControlOptions.find(
    (el) => el.value === getValues("accessControl"),
  )?.label

  const isMLA = getValues("mla") === "wildcatMLA"
  const isFixedTerm = getValues("marketType") === "fixedTerm"
  const isNewPolicy = getValues("policy") === "createNewPolicy"
  const policyNameValue = getValues("policyName") || "Unnamed Policy"
  const depositRequiresAccess = getValues("depositRequiresAccess")
  const withdrawalRequiresAccess = getValues("withdrawalRequiresAccess")
  const transferRequiresAccess = getValues("transferRequiresAccess")
  const disableTransfers = getValues("disableTransfers")
  const allowForceBuyBack = getValues("allowForceBuyBack")

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.PERIODS))
  }

  return (
    <Box sx={{ ...FormContainer, width: "71.5%" }}>
      <Typography variant="title2" sx={{ marginBottom: "36px" }}>
        Confirmation
      </Typography>

      <Typography
        variant="text4"
        sx={{ textTransform: "uppercase", marginBottom: "18px" }}
      >
        Market Policy
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
        }}
      >
        <ConfirmationFormItem
          label="Market Policy"
          value={isNewPolicy ? "NEW POLICY" : "EXISTING POLICY"}
        />

        <ConfirmationFormItem
          label={t(
            "createMarket.forms.marketDescription.block.policyName.title",
          )}
          value={policyNameValue}
        />
        <ConfirmationFormItem
          label={t(
            "createMarket.forms.marketDescription.block.marketType.title",
          )}
          value={marketTypeValue || ""}
        />

        <ConfirmationFormItem
          label={t(
            "createMarket.forms.marketDescription.block.accessControl.title",
          )}
          value={accessControlValue ?? "-"}
        />
      </Box>

      <Divider sx={{ margin: "24px 0" }} />

      <Typography
        variant="text4"
        sx={{ textTransform: "uppercase", marginBottom: "18px" }}
      >
        Basic Market Setup
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
        }}
      >
        <ConfirmationFormItem
          label={t(
            "createMarket.forms.marketDescription.block.marketAsset.title",
          )}
          value={tokenAsset?.name || ""}
        />

        <ConfirmationFormItem
          label={t(
            "createMarket.forms.marketDescription.block.marketTokenName.title",
          )}
          value={`${getValues("namePrefix")} ${tokenAsset?.name}`}
        />

        <ConfirmationFormItem
          label={t(
            "createMarket.forms.marketDescription.block.marketTokenSymbol.title",
          )}
          value={`${getValues("symbolPrefix")}${tokenAsset?.symbol}`}
        />
      </Box>

      <Divider sx={{ margin: "24px 0" }} />

      {isMLA && (
        <>
          <Box
            sx={{
              ...SectionGrid,
              gap: "20px 12px",
              gridTemplateRows: "repeat(1, 1fr)",
              alignItems: "center",
            }}
          >
            <Typography variant="text4" sx={{ textTransform: "uppercase" }}>
              Loan Agreement
            </Typography>

            <Button
              variant="contained"
              color="secondary"
              size="small"
              sx={{ width: "fit-content" }}
            >
              View MLA
            </Button>
          </Box>

          <Divider sx={{ margin: "24px 0" }} />
        </>
      )}

      {isFixedTerm && (
        <>
          <Typography
            variant="text4"
            sx={{ textTransform: "uppercase", marginBottom: "18px" }}
          >
            Market Type and Terms
          </Typography>

          <Box
            sx={{
              ...SectionGrid,
              gap: "20px 12px",
            }}
          >
            <ConfirmationFormItem
              label="Expiration Date"
              value={
                timestampToDateFormatted(
                  Number(getValues("fixedTermEndTime")),
                  "DD/MM/YYYY",
                ) ?? ""
              }
            />

            <ConfirmationFormItem
              label="Early Close"
              value={getValues("allowClosureBeforeTerm") ? "Yes" : "No"}
            />

            <ConfirmationFormItem
              label="Reduce Expiration"
              value={getValues("allowTermReduction") ? "Yes" : "No"}
            />
          </Box>

          <Divider sx={{ margin: "24px 0" }} />
        </>
      )}

      <Typography
        variant="text4"
        sx={{ textTransform: "uppercase", marginBottom: "18px" }}
      >
        Financial Terms
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
          gridTemplateRows: "repeat(3, 1fr)",
        }}
      >
        <ConfirmationFormItem
          label={t("createMarket.forms.marketDescription.block.capacity.title")}
          value={`${getValues("maxTotalSupply")} ${tokenAsset?.symbol}`}
        />

        <ConfirmationFormItem
          label={t("createMarket.forms.marketDescription.block.baseAPR.title")}
          value={`${getValues("annualInterestBips")}%`}
        />

        <ConfirmationFormItem
          label={t(
            "createMarket.forms.marketDescription.block.penaltyAPR.title",
          )}
          value={`${getValues("delinquencyFeeBips")}%`}
        />

        <ConfirmationFormItem
          label={t("createMarket.forms.marketDescription.block.ratio.title")}
          value={`${getValues("reserveRatioBips")}%`}
        />

        <ConfirmationFormItem
          label={t("createMarket.forms.marketDescription.block.deposit.title")}
          value={`${getValues("minimumDeposit")} ${tokenAsset?.symbol}`}
        />
      </Box>

      <Divider sx={{ margin: "24px 0" }} />

      <Typography
        variant="text4"
        sx={{ textTransform: "uppercase", marginBottom: "18px" }}
      >
        Lender Restrictions
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
        }}
      >
        <ConfirmationFormItem
          label="Restrict Deposits"
          value={depositRequiresAccess ? "Yes" : "No"}
        />

        <ConfirmationFormItem
          label={t(
            "createMarket.forms.marketDescription.block.transferAccess.title",
          )}
          value={disableTransfers ? "Yes" : "No"}
        />

        <ConfirmationFormItem
          label={t(
            "createMarket.forms.marketDescription.block.depositAccess.title",
          )}
          value={transferRequiresAccess ? "Yes" : "No"}
        />

        <ConfirmationFormItem
          label={t(
            "createMarket.forms.marketDescription.block.withdrawalAccess.title",
          )}
          value={withdrawalRequiresAccess ? "Yes" : "No"}
        />
      </Box>

      <Divider sx={{ margin: "24px 0" }} />

      <Typography
        variant="text4"
        sx={{ textTransform: "uppercase", marginBottom: "18px" }}
      >
        Borrower Restrictions
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
          gridTemplateRows: "repeat(1, 1fr)",
          alignItems: "center",
        }}
      >
        <ConfirmationFormItem
          label="Allow Force Buybacks"
          value={allowForceBuyBack ? "Yes" : "No"}
        />

        {allowForceBuyBack && (
          <Typography
            variant="text4"
            color={COLORS.carminePink}
            sx={{ maxWidth: "290px" }}
          >
            Note this will break integration with on-chain exchanges
          </Typography>
        )}
      </Box>

      <Divider sx={{ margin: "24px 0" }} />

      <Typography
        variant="text4"
        sx={{ textTransform: "uppercase", marginBottom: "18px" }}
      >
        Grace and Withdrawals
      </Typography>

      <Box
        sx={{
          ...SectionGrid,
          gap: "20px 12px",
          gridTemplateRows: "repeat(1, 1fr)",
        }}
      >
        <ConfirmationFormItem
          label={t(
            "createMarket.forms.marketDescription.block.gracePeriod.title",
          )}
          value={`${getValues("delinquencyGracePeriod")} hours`}
        />
        <ConfirmationFormItem
          label={t(
            "createMarket.forms.marketDescription.block.withdrawalCycle.title",
          )}
          value={`${getValues("withdrawalBatchDuration")} hours`}
        />
      </Box>

      <Box
        sx={{
          width: "100%",
          padding: "20px",
          borderRadius: "12px",
          backgroundColor: COLORS.hintOfRed,
          marginTop: "44px",
        }}
      >
        <Typography variant="text3">
          Note that once your market is created, the only adjustable parameters
          will be base APR and maximum capacity.
        </Typography>
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          marginTop: "38px",
        }}
      >
        <Button
          size="large"
          variant="text"
          sx={{ justifyContent: "flex-start" }}
          onClick={handleBackClick}
        >
          <SvgIcon
            fontSize="medium"
            sx={{
              marginRight: "4px",
              "& path": { fill: `${COLORS.bunker}` },
            }}
          >
            <BackArrow />
          </SvgIcon>
          Back
        </Button>

        <Box sx={{ display: "flex", gap: "4px" }}>
          {isMLA && (
            <Button
              size="large"
              variant="contained"
              sx={{ width: "140px" }}
              disabled={signed}
              onClick={() => setSigned(true)}
            >
              Sign MLA
            </Button>
          )}

          <Button
            size="large"
            variant="contained"
            sx={{ width: "140px" }}
            disabled={isMLA && !signed}
            // onClick={nextOnClick}
          >
            Deploy Market
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
