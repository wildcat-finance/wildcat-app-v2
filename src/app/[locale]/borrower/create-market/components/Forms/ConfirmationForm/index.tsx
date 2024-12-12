import { useState } from "react"

import { Box, Button, Divider, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { useTranslation } from "react-i18next"

import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import Info from "@/assets/icons/info_icon.svg"
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

import { ConfirmationFormProps } from "./interface"
import { AlertContainer, DividerStyle, SubtitleStyle } from "./style"
import { ConfirmationFormItem } from "../../ConfirmationFormItem"
import { FormContainer, SectionGrid } from "../style"

export const ConfirmationForm = ({
  form,
  tokenAsset,
  handleDeploy,
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

      <Typography variant="text4" sx={SubtitleStyle}>
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

      <Divider sx={DividerStyle} />

      <Typography variant="text4" sx={SubtitleStyle}>
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

      <Divider sx={DividerStyle} />

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

          <Divider sx={DividerStyle} />
        </>
      )}

      {isFixedTerm && (
        <>
          <Typography variant="text4" sx={SubtitleStyle}>
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

          <Divider sx={DividerStyle} />
        </>
      )}

      <Typography variant="text4" sx={SubtitleStyle}>
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

      <Divider sx={DividerStyle} />

      <Typography variant="text4" sx={SubtitleStyle}>
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

      <Divider sx={DividerStyle} />

      <Typography variant="text4" sx={SubtitleStyle}>
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
          <Box sx={{ width: "290px", display: "flex", gap: "6px" }}>
            <SvgIcon sx={{ "& path": { fill: COLORS.carminePink } }}>
              <Info />
            </SvgIcon>

            <Typography variant="text4" color={COLORS.carminePink}>
              Note this will break integration with on-chain exchanges
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="text4" sx={SubtitleStyle}>
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

      <Box sx={AlertContainer}>
        <SvgIcon sx={{ fontSize: "18px", "& path": { fill: COLORS.greySuit } }}>
          <Info />
        </SvgIcon>

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
          sx={{ justifyContent: "flex-start", borderRadius: "12px" }}
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
              sx={{ width: "168px", borderRadius: "12px" }}
              disabled={signed}
              onClick={() => setSigned(true)}
            >
              Sign MLA
            </Button>
          )}

          <Button
            size="large"
            variant="contained"
            sx={{ width: "168px", borderRadius: "12px" }}
            disabled={isMLA && !signed}
            onClick={handleDeploy}
          >
            Deploy Market
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
