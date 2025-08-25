import {
  Box,
  Button,
  Link as MuiLink,
  SvgIcon,
  Typography,
} from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import BackArrow from "@/assets/icons/backArrow_icon.svg"
import { COLORS } from "@/theme/colors"

export type CollateralHeaderProps = {
  contractsNumber: number | undefined
  contractName: string | undefined
  handleBackClick: () => void
  isBorrower: boolean
}

export const CollateralHeader = ({
  contractsNumber,
  contractName,
  handleBackClick,
  isBorrower,
}: CollateralHeaderProps) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        marginBottom: contractName ? "20px" : "24px",
      }}
    >
      {contractName ? (
        <>
          <Button
            onClick={handleBackClick}
            size="medium"
            variant="text"
            sx={{
              color: COLORS.ultramarineBlue,
              gap: "4px",
              alignItems: "center",
              padding: "8px 12px 8px 0px",
              "&:hover": {
                bgcolor: "transparent",
                color: COLORS.ultramarineBlue,
              },
            }}
          >
            <SvgIcon
              sx={{
                fontSize: "16px",
                "& path": { fill: COLORS.ultramarineBlue },
              }}
            >
              <BackArrow />
            </SvgIcon>
            All Сollateral Contracts
          </Button>

          <Typography variant="title3" marginTop="12px">
            {contractName}
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="title3">
            {t("collateral.actions.title")}
          </Typography>

          {contractsNumber === 0 && isBorrower ? (
            <Typography variant="text2" color={COLORS.santasGrey}>
              {t("collateral.actions.firstContractDesc")}
            </Typography>
          ) : (
            <Typography variant="text2" color={COLORS.santasGrey}>
              {t("collateral.actions.description")}{" "}
              <MuiLink
                component={Link}
                href="https://docs.wildcat.finance"
                variant="inherit"
                underline="always"
                color="inherit"
                target="_blank"
              >
                {t("collateral.actions.learnMore")}
              </MuiLink>
            </Typography>
          )}
        </>
      )}
    </Box>
  )
}
