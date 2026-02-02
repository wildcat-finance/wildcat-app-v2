import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import TokenWrapIcon from "@/assets/icons/tokenWrap_icon.svg"
import { MiniLoader } from "@/components/Loader"
import { COLORS } from "@/theme/colors"

import {
  LearnMoreButton,
  NoWrapperStateContainer,
  PlaceholderIcon,
  CreateButton,
  PlaceholderTitle,
  QuestionItem,
  QuestionsContainer,
} from "./style"

export type NoWrapperStateProps = {
  canCreateWrapper: boolean
  onCreateWrapper?: () => void
  isCreatingWrapper?: boolean
  disableCreateWrapper?: boolean
  statusMessage?: string
}

export const NoWrapperState = ({
  canCreateWrapper,
  onCreateWrapper,
  isCreatingWrapper,
  disableCreateWrapper,
  statusMessage,
}: NoWrapperStateProps) => {
  const { t } = useTranslation()

  return (
    <Box>
      <Box sx={NoWrapperStateContainer}>
        <SvgIcon sx={PlaceholderIcon}>
          <TokenWrapIcon />
        </SvgIcon>

        <Typography variant="text1" sx={PlaceholderTitle}>
          {t("lenderMarketDetails.wrapDebtToken.title")}
        </Typography>

        <Typography variant="text2" color={COLORS.manate}>
          {t("lenderMarketDetails.wrapDebtToken.subtitle")}
        </Typography>

        {statusMessage && (
          <Typography variant="text3" color={COLORS.manate}>
            {statusMessage}
          </Typography>
        )}

        {canCreateWrapper && (
          <Button
            variant="contained"
            size="large"
            onClick={onCreateWrapper}
            disabled={disableCreateWrapper || isCreatingWrapper}
            sx={CreateButton}
          >
            {isCreatingWrapper ? (
              <>
                <MiniLoader />
                {t("lenderMarketDetails.wrapDebtToken.deployButton")}
              </>
            ) : (
              t("lenderMarketDetails.wrapDebtToken.deployButton")
            )}
          </Button>
        )}
      </Box>

      <Box sx={QuestionsContainer}>
        <Typography variant="title3">
          {t("lenderMarketDetails.wrapDebtToken.commonQuestions")}
        </Typography>

        <Box sx={QuestionItem}>
          <Typography variant="text2">
            {t("lenderMarketDetails.wrapDebtToken.whatIsWrapping.question")}
          </Typography>

          <Typography variant="text2" color={COLORS.manate}>
            {t("lenderMarketDetails.wrapDebtToken.whatIsWrapping.answer")}
          </Typography>
        </Box>

        <Box sx={QuestionItem}>
          <Typography variant="text2">
            {t("lenderMarketDetails.wrapDebtToken.whoCanDeploy.question")}
          </Typography>

          <Typography variant="text2" color={COLORS.manate}>
            {t("lenderMarketDetails.wrapDebtToken.whoCanDeploy.answer")}
          </Typography>
        </Box>

        <Box sx={QuestionItem}>
          <Typography variant="text2">
            {t("lenderMarketDetails.wrapDebtToken.whatHappensAfter.question")}
          </Typography>

          <Typography variant="text2" color={COLORS.manate}>
            {t("lenderMarketDetails.wrapDebtToken.whatHappensAfter.answer")}
          </Typography>
        </Box>
      </Box>

      <Link
        href="https://docs.wildcat.finance/"
        target="_blank"
        style={LearnMoreButton}
      >
        <Button variant="contained" color="secondary" size="medium">
          {t("lenderMarketDetails.wrapDebtToken.learnMore")}
        </Button>
      </Link>
    </Box>
  )
}
