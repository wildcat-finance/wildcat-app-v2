"use client"

import { ReactNode, useEffect, useMemo, useRef, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  IconButton,
  Skeleton,
  SvgIcon,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import Cross from "@/assets/icons/cross_icon.svg"
import ExternalLink from "@/assets/icons/externalLink_icon.svg"
import { Alert } from "@/components/Alert"
import { AlertColor } from "@/components/Alert/type"
import { MiniLoader } from "@/components/Loader"
import { LENDER_KYC_FIELD_MAX_LENGTH } from "@/config/lender-kyc"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSafeMessageSigning } from "@/hooks/useSafeMessageSigning"
import { COLORS } from "@/theme/colors"
import { formatUnixMsAsDate, trimAddress } from "@/utils/formatters"
import { buildLenderKycMessage } from "@/utils/lenderKycMessage"

import {
  KycPrivacyNotice,
  KycTermsCheckbox,
  KycTermsStatement,
} from "./components/KycTermsCheckbox"
import { KycTextField } from "./components/KycTextField"
import { LenderTypeSelect } from "./components/LenderTypeSelect"
import { SignedMessagePreview } from "./components/SignedMessagePreview"
import {
  BodyInnerSx,
  BodySx,
  ContentLayerSx,
  DesktopDialogSx,
  FieldsGridSx,
  FooterSx,
  HeaderSx,
  LoadingSkeletonSx,
  MobileCloseIconSx,
  MobileDialogSx,
  MobileTitleRowSx,
  ContinueIconSx,
  PrimaryButtonSx,
  ROW_HEIGHT,
  WalletRowSx,
} from "./style"
import { useLenderKycDialogState } from "./useLenderKycDialogState"

const MESSAGE_PREVIEW_NONCE = "issued when you sign"

export type LenderKycDialogProps = {
  open: boolean
  address: string
  chainId: number
  onClose: () => void
  onExited?: () => void
}

export const LenderKycDialog = ({
  open,
  address,
  chainId,
  onClose,
  onExited,
}: LenderKycDialogProps) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const { safeConnected } = useSafeMessageSigning()
  const state = useLenderKycDialogState({ open, address, chainId })

  const trimmedAddress = trimAddress(address)
  const [isMessageOpen, setIsMessageOpen] = useState(false)
  const [lockedBodyHeight, setLockedBodyHeight] = useState<number | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!state.isLoading) return
    setIsMessageOpen(false)
    setLockedBodyHeight(null)
  }, [state.isLoading])

  const toggleMessage = () => {
    if (isMessageOpen) {
      setIsMessageOpen(false)
      return
    }
    const body = bodyRef.current
    if (body) {
      body.scrollTop = 0
      setLockedBodyHeight(body.clientHeight)
    }
    setIsMessageOpen(true)
  }

  const handlePanelTransitionEnd = () => {
    if (!isMessageOpen) setLockedBodyHeight(null)
  }

  const messagePreview = useMemo(
    () =>
      buildLenderKycMessage({
        kind: state.isReturningLocked ? "ownership" : "details",
        address,
        chainId,
        nonce: MESSAGE_PREVIEW_NONCE,
        timeSigned: Date.now(),
        details: state.details,
      }),
    [address, chainId, state.isReturningLocked, state.details],
  )

  const signErrorNotice: { color: AlertColor; text: string } | null =
    useMemo(() => {
      if (state.isUnavailable)
        return { color: "red", text: t("lenderKyc.modal.notices.unavailable") }
      if (state.signError === "declined")
        return { color: "amber", text: t("lenderKyc.modal.notices.declined") }
      if (state.signError === "walletMismatch")
        return {
          color: "amber",
          text: state.mismatchSigner
            ? t("lenderKyc.modal.notices.walletMismatchSigner", {
                address: trimAddress(state.mismatchSigner),
              })
            : t("lenderKyc.modal.notices.walletMismatch"),
        }
      if (state.signError === "failed")
        return { color: "red", text: t("lenderKyc.modal.notices.failed") }
      if (state.showInvalidNotice)
        return { color: "amber", text: t("lenderKyc.modal.notices.invalid") }
      return null
    }, [
      state.isUnavailable,
      state.signError,
      state.mismatchSigner,
      state.showInvalidNotice,
      t,
    ])

  const successNotice = useMemo(() => {
    if (!state.canContinue) return null
    if (state.lastOutcome === "skipped")
      return t("lenderKyc.modal.notices.signedNoDetails", {
        address: trimmedAddress,
      })
    if (state.mode === "returning" && state.lastOutcome === "unchanged")
      return t("lenderKyc.modal.notices.signedUnchanged", {
        address: trimmedAddress,
      })
    return t("lenderKyc.modal.notices.signedWithDetails", {
      address: trimmedAddress,
    })
  }, [state.canContinue, state.lastOutcome, state.mode, trimmedAddress, t])

  const primaryLabel = (() => {
    if (state.isSigning) return t("lenderKyc.modal.buttons.confirming")
    if (state.canContinue) return t("lenderKyc.modal.buttons.continue")
    if (state.signError === "walletMismatch")
      return t("lenderKyc.modal.buttons.signAgain")
    return t("lenderKyc.modal.buttons.sign")
  })()

  const caption = (() => {
    if (state.isSigning)
      return safeConnected
        ? t("lenderKyc.modal.captions.confirmingSafe")
        : t("lenderKyc.modal.captions.confirming")
    if (state.canContinue) return t("lenderKyc.modal.captions.continue")
    if (state.isReturningLocked) return null
    if (!state.termsAccepted) return t("lenderKyc.modal.captions.tickTerms")
    return t("lenderKyc.modal.captions.sign")
  })()

  const handlePrimaryClick = () => {
    if (state.canContinue) {
      state.continueToSoma()
      return
    }
    state.sign()
  }

  const errorText = (field: "fullName" | "email" | "companyName") => {
    const error = state.fieldErrors[field]
    if (!error) return undefined
    if (error === "email") return t("lenderKyc.modal.errors.email")
    if (error === "invalidCharacters") {
      return t("lenderKyc.modal.errors.invalidCharacters")
    }
    return t("lenderKyc.modal.errors.tooLong", {
      max: LENDER_KYC_FIELD_MAX_LENGTH,
    })
  }

  const withLoadingSkeleton = (node: ReactNode) =>
    state.isLoading ? (
      <Skeleton variant="rounded" sx={LoadingSkeletonSx}>
        {node}
      </Skeleton>
    ) : (
      node
    )

  const renderForm = () => (
    <>
      <Box sx={FieldsGridSx}>
        {withLoadingSkeleton(
          <KycTextField
            id="lender-kyc-full-name"
            label={t("lenderKyc.modal.fields.fullName")}
            placeholder={t("lenderKyc.modal.fields.fullNamePlaceholder")}
            value={state.details.fullName}
            disabled={state.isSigning}
            readOnly={state.fieldsReadOnly}
            error={errorText("fullName")}
            onChange={(value) => state.updateField("fullName", value)}
            onBlur={() => state.touchField("fullName")}
          />,
        )}
        {withLoadingSkeleton(
          <KycTextField
            id="lender-kyc-email"
            type="email"
            label={t("lenderKyc.modal.fields.email")}
            placeholder={t("lenderKyc.modal.fields.emailPlaceholder")}
            value={state.details.email}
            disabled={state.isSigning}
            readOnly={state.fieldsReadOnly}
            error={errorText("email")}
            onChange={(value) => state.updateField("email", value)}
            onBlur={() => state.touchField("email")}
          />,
        )}
      </Box>

      {withLoadingSkeleton(
        <KycTextField
          id="lender-kyc-company"
          label={
            <>
              {t("lenderKyc.modal.fields.company")}{" "}
              <Box component="span" sx={{ color: COLORS.greySuit }}>
                {t("lenderKyc.modal.fields.optional")}
              </Box>
            </>
          }
          placeholder={t("lenderKyc.modal.fields.companyPlaceholder")}
          value={state.details.companyName}
          disabled={state.isSigning}
          readOnly={state.fieldsReadOnly}
          error={errorText("companyName")}
          onChange={(value) => state.updateField("companyName", value)}
          onBlur={() => state.touchField("companyName")}
        />,
      )}

      {withLoadingSkeleton(
        <LenderTypeSelect
          value={state.details.lenderTypes}
          disabled={state.isSigning}
          readOnly={state.fieldsReadOnly}
          onChange={(value) => state.updateField("lenderTypes", value)}
        />,
      )}

      {state.isVerified && !state.isEditing && !state.isSigning && (
        <Button
          variant="text"
          size="small"
          disableRipple
          onClick={state.startEditing}
          sx={{
            alignSelf: "flex-start",
            padding: 0,
            minWidth: 0,
            color: COLORS.blueRibbon,
            textDecoration: "underline",
            "&:hover": {
              color: COLORS.blueRibbon,
              textDecoration: "underline",
              backgroundColor: "transparent",
            },
          }}
        >
          {t("lenderKyc.modal.editDetails")}
        </Button>
      )}

      {withLoadingSkeleton(
        <KycTermsCheckbox
          checked={state.termsAccepted}
          disabled={state.isSigning || state.isVerified}
          onChange={state.setTermsAccepted}
        />,
      )}

      {withLoadingSkeleton(<KycPrivacyNotice />)}
    </>
  )

  const renderBody = () => {
    if (state.isLoading) return renderForm()

    return (
      <>
        {state.isReturningLocked && (
          <Alert
            color="blue"
            variant="text3"
            sx={{ maxWidth: "none" }}
            text={t("lenderKyc.modal.notices.returning")}
          />
        )}
        {state.mode === "returning" && state.isVerified && state.savedAt && (
          <Alert
            color="blue"
            variant="text3"
            sx={{ maxWidth: "none" }}
            text={t("lenderKyc.modal.notices.loaded", {
              date: formatUnixMsAsDate(Date.parse(state.savedAt)),
            })}
          />
        )}
        {state.resumesSafeRequest && (
          <Alert
            color="blue"
            variant="text3"
            sx={{ maxWidth: "none" }}
            text={t("lenderKyc.modal.notices.safePending")}
          />
        )}

        {state.isReturningLocked ? <KycTermsStatement /> : renderForm()}
      </>
    )
  }

  return (
    <Dialog
      data-hj-suppress
      open={open}
      onClose={onClose}
      maxWidth={false}
      aria-labelledby="lender-kyc-dialog-title"
      TransitionProps={{ onExited }}
      sx={isMobile ? MobileDialogSx : DesktopDialogSx}
    >
      {isMobile ? (
        <Box sx={MobileTitleRowSx}>
          <Box width="20px" height="20px" flexShrink={0} />
          <Typography
            id="lender-kyc-dialog-title"
            component="h2"
            variant="mobText1"
            textAlign="center"
            color={COLORS.blackRock}
          >
            {t("lenderKyc.modal.title")}
          </Typography>
          <IconButton
            disableRipple
            onClick={onClose}
            aria-label={t("lenderKyc.modal.close")}
          >
            <SvgIcon sx={MobileCloseIconSx}>
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>
      ) : (
        <Box sx={HeaderSx}>
          <Typography
            id="lender-kyc-dialog-title"
            component="h2"
            variant="title3"
            color={COLORS.bunker}
          >
            {t("lenderKyc.modal.title")}
          </Typography>
          <IconButton
            disableRipple
            onClick={onClose}
            aria-label={t("lenderKyc.modal.close")}
          >
            <SvgIcon fontSize="big">
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>
      )}

      <Box ref={bodyRef} sx={BodySx(isMessageOpen)}>
        <Box sx={BodyInnerSx(lockedBodyHeight)}>
          <Box sx={ContentLayerSx(isMessageOpen)} aria-hidden={isMessageOpen}>
            <Box sx={WalletRowSx}>
              <Typography variant="text3" color={COLORS.santasGrey}>
                {t("lenderKyc.modal.connectedWallet")}
              </Typography>
              <Typography variant="text3" color={COLORS.blackRock}>
                {trimmedAddress}
              </Typography>
            </Box>
            {renderBody()}
          </Box>
          {state.isLoading ? (
            <Skeleton
              variant="rounded"
              height={ROW_HEIGHT}
              sx={{ ...LoadingSkeletonSx, flexShrink: 0 }}
            />
          ) : (
            <SignedMessagePreview
              message={messagePreview}
              isOpen={isMessageOpen}
              onToggle={toggleMessage}
              onTransitionEnd={handlePanelTransitionEnd}
            />
          )}
        </Box>
      </Box>

      <Box sx={FooterSx}>
        {state.isDirty && !state.isSigning && !signErrorNotice && (
          <Alert
            color="blue"
            variant="text3"
            sx={{ maxWidth: "none" }}
            text={t("lenderKyc.modal.notices.edited")}
          />
        )}
        {signErrorNotice && !state.isSigning && (
          <Alert
            color={signErrorNotice.color}
            variant="text3"
            sx={{ maxWidth: "none" }}
            text={signErrorNotice.text}
          />
        )}
        {successNotice && (
          <Alert
            color="green"
            variant="text3"
            sx={{ maxWidth: "none" }}
            text={successNotice}
          />
        )}
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={!state.canContinue && !state.canSign}
          onClick={handlePrimaryClick}
          sx={PrimaryButtonSx}
        >
          {state.isSigning && <MiniLoader />}
          {primaryLabel}
          {state.canContinue && (
            <SvgIcon viewBox="0 0 16 16" sx={ContinueIconSx}>
              <ExternalLink />
            </SvgIcon>
          )}
        </Button>
        {caption && (
          <Typography
            variant={isMobile ? "mobText4" : "text4"}
            component="p"
            color={COLORS.santasGrey}
            textAlign="center"
          >
            {caption}
          </Typography>
        )}
      </Box>
    </Dialog>
  )
}
