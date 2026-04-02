import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import TokenWrapIcon from "@/assets/icons/tokenWrap_icon.svg"
import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { MiniLoader } from "@/components/Loader"
import { useMobileResolution } from "@/hooks/useMobileResolution"
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
  const isMobile = useMobileResolution()

  const [open, setOpen] = React.useState(!isMobile)

  return (
    <Box
      sx={{
        backgroundColor: isMobile ? COLORS.white : "transparent",
        padding: isMobile ? "26px 16px 12px 16px" : "0",
        borderRadius: isMobile ? "14px" : "0",
      }}
    >
      <Box sx={NoWrapperStateContainer(isMobile)}>
        <SvgIcon sx={PlaceholderIcon}>
          <TokenWrapIcon />
        </SvgIcon>

        <Typography
          variant={isMobile ? "mobH3" : "text1"}
          sx={PlaceholderTitle}
        >
          {t("wrapDebtToken.noWrapper.title")}
        </Typography>

        <Typography
          variant={isMobile ? "mobText2" : "text2"}
          textAlign="center"
          color={COLORS.manate}
        >
          {t("wrapDebtToken.noWrapper.subtitle")}
        </Typography>

        {statusMessage && (
          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            color={COLORS.manate}
          >
            {statusMessage}
          </Typography>
        )}

        {canCreateWrapper && (
          <Button
            variant="contained"
            size="large"
            fullWidth={isMobile}
            onClick={onCreateWrapper}
            disabled={disableCreateWrapper || isCreatingWrapper}
            sx={CreateButton}
          >
            {isCreatingWrapper ? (
              <>
                <MiniLoader />
                {t("wrapDebtToken.noWrapper.deployButton")}
              </>
            ) : (
              t("wrapDebtToken.noWrapper.deployButton")
            )}
          </Button>
        )}
      </Box>

      {open && isMobile && <Divider sx={{ marginBottom: "20px" }} />}

      {open && (
        <Box sx={QuestionsContainer(isMobile)}>
          {!isMobile && (
            <Typography variant="title3">
              {t("wrapDebtToken.noWrapper.commonQuestions")}
            </Typography>
          )}

          <Box sx={QuestionItem}>
            <Typography variant={isMobile ? "mobText2SemiBold" : "text2"}>
              {t("wrapDebtToken.noWrapper.questions.whatIsWrapping.question")}
            </Typography>

            <Typography
              variant={isMobile ? "mobText2" : "text2"}
              color={COLORS.manate}
            >
              {t("wrapDebtToken.noWrapper.questions.whatIsWrapping.answer")}
            </Typography>
          </Box>

          <Box sx={QuestionItem}>
            <Typography variant={isMobile ? "mobText2SemiBold" : "text2"}>
              {t("wrapDebtToken.noWrapper.questions.whoCanDeploy.question")}
            </Typography>

            <Typography
              variant={isMobile ? "mobText2" : "text2"}
              color={COLORS.manate}
            >
              {t("wrapDebtToken.noWrapper.questions.whoCanDeploy.answer")}
            </Typography>
          </Box>

          <Box sx={QuestionItem}>
            <Typography variant={isMobile ? "mobText2SemiBold" : "text2"}>
              {t("wrapDebtToken.noWrapper.questions.whatHappensAfter.question")}
            </Typography>

            <Typography
              variant={isMobile ? "mobText2" : "text2"}
              color={COLORS.manate}
            >
              {t("wrapDebtToken.noWrapper.questions.whatHappensAfter.answer")}
            </Typography>
          </Box>
        </Box>
      )}

      {open && (
        <Link
          href="https://docs.wildcat.finance/"
          target="_blank"
          style={LearnMoreButton(isMobile)}
        >
          <Button
            variant="contained"
            color="secondary"
            size="medium"
            fullWidth={isMobile}
          >
            {t("common.actions.learnMore")}
          </Button>
        </Link>
      )}

      {isMobile && (
        <Button
          variant="text"
          size="small"
          fullWidth
          onClick={() => setOpen(!open)}
          sx={{
            padding: "12px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: COLORS.ultramarineBlue,

            "&:hover": {
              color: COLORS.ultramarineBlue,
              backgroundColor: "transparent",
            },
          }}
        >
          <SvgIcon
            sx={{
              fontSize: "12px",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              "& path": { fill: COLORS.ultramarineBlue },
            }}
          >
            <UpArrow />
          </SvgIcon>
          {open
            ? t("wrapDebtToken.noWrapper.seeLess")
            : t("wrapDebtToken.noWrapper.seeMore")}
        </Button>
      )}
    </Box>
  )
}
