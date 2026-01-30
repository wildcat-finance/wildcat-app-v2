import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import TokenWrapIcon from "@/assets/icons/tokenWrap_icon.svg"
import { useAppDispatch } from "@/store/hooks"
import {
  setTokenWrapperStep,
  WrapDebtTokenFlowSteps,
} from "@/store/slices/wrapDebtTokenFlowSlice/wrapDebtTokenFlowSlice"
import { COLORS } from "@/theme/colors"

import {
  LearnMoreButton,
  NoWrapperPlaceholderContainer,
  PlaceholderIcon,
  CreateButton,
  PlaceholderTitle,
  QuestionItem,
  QuestionsContainer,
} from "./style"

export type NoWrapperPlaceholderProps = {
  canCreateWrapper: boolean
}

export const NoWrapperPlaceholder = ({
  canCreateWrapper,
}: NoWrapperPlaceholderProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const handleClick = () => {
    dispatch(setTokenWrapperStep(WrapDebtTokenFlowSteps.HAS_WRAPPER))
  }

  return (
    <Box>
      <Box sx={NoWrapperPlaceholderContainer}>
        <SvgIcon sx={PlaceholderIcon}>
          <TokenWrapIcon />
        </SvgIcon>

        <Typography variant="text1" sx={PlaceholderTitle}>
          {t("lenderMarketDetails.wrapDebtToken.title")}
        </Typography>

        <Typography variant="text2" color={COLORS.manate}>
          {t("lenderMarketDetails.wrapDebtToken.subtitle")}
        </Typography>

        {canCreateWrapper && (
          <Button
            variant="contained"
            size="large"
            onClick={handleClick}
            sx={CreateButton}
          >
            {t("lenderMarketDetails.wrapDebtToken.deployButton")}
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
