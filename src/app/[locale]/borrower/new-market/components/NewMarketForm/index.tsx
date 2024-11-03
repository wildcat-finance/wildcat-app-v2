"use client";

import { useEffect, useMemo } from "react";

import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import SvgIcon from "@mui/material/SvgIcon";
import { Token } from "@wildcatfi/wildcat-sdk";
import Link from "next/link";
import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  MarketValidationSchemaType,
} from "@/app/[locale]/borrower/new-market/validation/validationSchema";
import { TokenInfo } from "@/app/api/tokens-list/interface";
import BackArrow from "@/assets/icons/arrowLeft_icon.svg";
import { ExtendedSelect } from "@/components/@extended/ExtendedSelect";
import { ExtendedSelectOptionItem } from "@/components/@extended/ExtendedSelect/type";
import { Accordion } from "@/components/Accordion";
import { InputLabel } from "@/components/InputLabel";
import {
  InputLabelContainer,
  InputLabelSubtitle,
  InputLabelTypo,
} from "@/components/InputLabel/style";
import { NumberTextField } from "@/components/NumberTextfield";
import { StyledSwitch } from "@/components/StyledSwitch/input";
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip";
import { TooltipButton } from "@/components/TooltipButton";
import {
  mockedKYCPreferencesOptions,
  mockedMarketTypesOptions,
  mockedMLATemplatesOptions,
} from "@/mocks/mocks";
import { ROUTES } from "@/routes";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setDisableConfirmationStepSidebar,
  setDisableInfoStepSidebar,
  setHideInfoStep,
  setNextStep,
} from "@/store/slices/routingSlice/routingSlice";

import {
  BackButton,
  BackButtonArrow,
  ButtonsContainer,
  DividerStyle,
  DropdownOption,
  endDecorator,
  InputGroupContainer,
  NextButton,
} from "./style";
import { UnderlyingAssetSelect } from "./UnderlyingAssetSelect";

type NewMarketFormProps = {
  form: UseFormReturn<MarketValidationSchemaType>;
  tokenAsset: Token | undefined;
  policyOptions: ExtendedSelectOptionItem[];
};

export const NewMarketForm = ({
  form,
  tokenAsset,
  policyOptions,
}: NewMarketFormProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const {
    getValues,
    setValue,
    register,
    formState: { errors, isValid },
    control,
    watch,
  } = form;

  const mlaWatch = watch("mla");

  const policyWatch = watch("policy");
  const policyNameWatch = watch("policyName");
  const namePrefixWatch = watch("namePrefix");
  const symbolPrefixWatch = watch("symbolPrefix");
  const marketTypeWatch = watch("marketType");
  const forceBuyBackWatch = watch("allowForceBuyBack");
  const allowClosureBeforeTermWatch = watch("allowClosureBeforeTerm");
  const allowTermReductionWatch = watch("allowTermReduction");
  const transferRequiresAccessWatch = watch("transferRequiresAccess");
  const withdrawalRequiresAccessWatch = watch("withdrawalRequiresAccess");
  const depositRequiresAccessWatch = watch("depositRequiresAccess");
  const disableTransfersWatch = watch("disableTransfers");
  const hideLegalInfoStep = useAppSelector(
    (state) => state.routing.hideInfoStep
  );

  const isFixedTerm = useMemo(
    () => marketTypeWatch === "fixedTerm",
    [marketTypeWatch]
  );

  const handleTokenSelect = (asset: TokenInfo | null) => {
    setValue("asset", (asset ? asset.address : "0x") as `0x${string}`);
  };

  const handleClickNext = () => {
    dispatch(
      setNextStep(hideLegalInfoStep ? "confirmation" : "legalInformation")
    );
  };

  useEffect(() => {
    if (mlaWatch === "wildcatMLA") {
      dispatch(setHideInfoStep(false));
    } else {
      dispatch(setHideInfoStep(true));
    }
  }, [mlaWatch]);

  useEffect(() => {
    if (hideLegalInfoStep) {
      dispatch(setDisableConfirmationStepSidebar(!isValid));
      dispatch(setDisableInfoStepSidebar(true));
    } else {
      dispatch(setDisableConfirmationStepSidebar(true));
      dispatch(setDisableInfoStepSidebar(!isValid));
    }
  }, [isValid, hideLegalInfoStep]);

  const tokenSelectorFormProps = register("asset");

  return (
    <Box maxWidth="766px" width="100%">
      <Box marginBottom="20px">
        <Typography variant="title2">
          {t("createMarket.forms.marketDescription.title")}
        </Typography>
      </Box>

      <Box sx={InputGroupContainer}>
        <InputLabel
          label={t("createMarket.forms.marketDescription.block.policy.title")}
          subtitle={t(
            "createMarket.forms.marketDescription.block.policy.subtitle"
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.policy.tooltip"
          )}
          key="x"
        >
          <ExtendedSelect
            control={control}
            name="policy"
            label={t(
              "createMarket.forms.marketDescription.block.policy.placeholder"
            )}
            options={policyOptions}
            optionSX={DropdownOption}
          />
        </InputLabel>

        <Box marginTop="16px">
          <Accordion title="What is a market policy?">
            <Typography variant="text3">
              A market policy dictates the kind of loan (open or fixed term) and
              the requirements for approval to use the market.
              <br />
              <br />
              Many markets can use the same policy if they are all of the same
              type and should be accessible to the same group of lenders;
              however, all other options are still unique to each market, such
              as when the loan reaches maturity for fixed markets and which
              transactions are restricted to approved lenders.
            </Typography>
          </Accordion>
        </Box>
      </Box>

      <Divider sx={DividerStyle} />

      {policyWatch === "createNewPolicy" ? (
        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.policyName.title"
          )}
          margin="16px 0 0 0"
          tooltipText={t(
            "createMarket.forms.marketDescription.block.policyName.tooltip"
          )}
        >
          <TextField
            label={t(
              "createMarket.forms.marketDescription.block.policyName.placeholder"
            )}
            error={Boolean(errors.policyName)}
            helperText={errors.policyName?.message}
            placeholder={t(
              "createMarket.forms.marketDescription.block.policyName.placeholder"
            )}
            {...register("policyName")}
          />
        </InputLabel>
      ) : (
        <Box margin="16px 0 0 0">
          <Typography variant="text1">Policy: {policyNameWatch}</Typography>
        </Box>
      )}

      <Box sx={InputGroupContainer} marginTop="16px">
        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.marketType.title"
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.marketType.tooltip"
          )}
        >
          <ExtendedSelect
            control={control}
            name="marketType"
            label={t(
              "createMarket.forms.marketDescription.block.marketType.placeholder"
            )}
            options={mockedMarketTypesOptions}
            optionSX={DropdownOption}
            disabled={policyWatch !== "createNewPolicy"}
          />
        </InputLabel>

        <InputLabel
          label={t("createMarket.forms.marketDescription.block.kyc.title")}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.kyc.tooltip"
          )}
        >
          <ExtendedSelect
            control={control}
            name="kyc"
            label={t(
              "createMarket.forms.marketDescription.block.kyc.placeholder"
            )}
            options={mockedKYCPreferencesOptions}
            optionSX={DropdownOption}
            disabled={policyWatch !== "createNewPolicy"}
          />
        </InputLabel>
      </Box>
      <Divider sx={DividerStyle} />

      <Typography variant="text1">
        {t("createMarket.forms.marketDescription.block.title.definition")}
      </Typography>

      <Box sx={InputGroupContainer} marginTop="36px">
        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.marketAsset.title"
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.marketAsset.tooltip"
          )}
        >
          <UnderlyingAssetSelect
            handleTokenSelect={handleTokenSelect}
            onBlur={tokenSelectorFormProps.onBlur}
            ref={tokenSelectorFormProps.ref}
            error={Boolean(errors.asset)}
            errorText={errors.asset?.message}
          />
        </InputLabel>

        <InputLabel
          label={t("createMarket.forms.marketDescription.block.mla.title")}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.mla.tooltip"
          )}
        >
          <ExtendedSelect
            control={control}
            name="mla"
            label={t(
              "createMarket.forms.marketDescription.block.mla.placeholder"
            )}
            options={mockedMLATemplatesOptions}
            optionSX={DropdownOption}
          />
        </InputLabel>
      </Box>

      <Box sx={InputGroupContainer}>
        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.marketTokenName.title"
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.marketTokenName.tooltip"
          )}
          margin="36px 0 0 0"
          subtitle={
            namePrefixWatch && tokenAsset
              ? `Resulting Name: ${namePrefixWatch}${tokenAsset?.name}`
              : ""
          }
        >
          <TextField
            label={t(
              "createMarket.forms.marketDescription.block.marketTokenName.placeholder"
            )}
            error={Boolean(errors.namePrefix)}
            helperText={errors.namePrefix?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <TextfieldChip
                    text={
                      tokenAsset?.name ||
                      `${t(
                        "createMarket.forms.marketDescription.block.marketTokenName.chip"
                      )}`
                    }
                  />
                </InputAdornment>
              ),
            }}
            {...register("namePrefix")}
          />
        </InputLabel>

        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.marketTokenSymbol.title"
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.marketTokenSymbol.tooltip"
          )}
          margin="36px 0 0 0"
          subtitle={
            symbolPrefixWatch && tokenAsset
              ? `Resulting Symbol: ${symbolPrefixWatch}${tokenAsset?.symbol}`
              : ""
          }
        >
          <TextField
            label={t(
              "createMarket.forms.marketDescription.block.marketTokenSymbol.placeholder"
            )}
            error={Boolean(errors.symbolPrefix)}
            helperText={errors.symbolPrefix?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <TextfieldChip
                    text={
                      tokenAsset?.symbol ||
                      `${t(
                        "createMarket.forms.marketDescription.block.marketTokenSymbol.chip"
                      )}`
                    }
                  />
                </InputAdornment>
              ),
            }}
            {...register("symbolPrefix")}
          />
        </InputLabel>
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="text1">
        {t("createMarket.forms.marketDescription.block.title.restrictions")}
      </Typography>

      <Box sx={InputGroupContainer} marginTop="16px">
        <InputLabel
          label={t("createMarket.forms.marketDescription.block.deposit.title")}
          subtitle={t(
            "createMarket.forms.marketDescription.block.deposit.subtitle"
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.deposit.tooltip"
          )}
        >
          <NumberTextField
            label="0"
            size="medium"
            style={{ maxWidth: "300px" }}
            value={getValues("minimumDeposit")}
            error={Boolean(errors.minimumDeposit)}
            helperText={errors.minimumDeposit?.message}
            endAdornment={
              <TextfieldChip
                text={
                  tokenAsset?.symbol ||
                  `${t(
                    "createMarket.forms.marketDescription.block.deposit.chip"
                  )}`
                }
              />
            }
            {...register("minimumDeposit")}
          />
        </InputLabel>
      </Box>

      <Box marginTop="16px">
        <FormControlLabel
          label={
            <Box>
              <Box sx={InputLabelContainer} marginBottom="2px">
                <Box sx={InputLabelTypo}>
                  <Typography variant="text3">
                    {t(
                      "createMarket.forms.marketDescription.block.depositRequiresAccess.title"
                    )}
                  </Typography>
                </Box>
                <TooltipButton
                  value={t(
                    "createMarket.forms.marketDescription.block.depositRequiresAccess.tooltip"
                  )}
                />
              </Box>
              <Typography
                marginTop="0px"
                variant="text4"
                sx={InputLabelSubtitle}
              >
                {t(
                  "createMarket.forms.marketDescription.block.depositRequiresAccess.subtitle"
                )}
              </Typography>
            </Box>
          }
          control={
            <StyledSwitch
              checkedColor="orange"
              size="medium"
              checked={depositRequiresAccessWatch}
              onChange={(e) => {
                setValue("depositRequiresAccess", e.target.checked);
              }}
            />
          }
        />
      </Box>

      <Box marginTop="16px">
        <FormControlLabel
          label={
            <Box>
              <Box sx={InputLabelContainer} marginBottom="2px">
                <Box sx={InputLabelTypo}>
                  <Typography variant="text3">
                    {t(
                      "createMarket.forms.marketDescription.block.withdrawalRequiresAccess.title"
                    )}
                  </Typography>
                </Box>
                <TooltipButton
                  value={t(
                    "createMarket.forms.marketDescription.block.withdrawalRequiresAccess.tooltip"
                  )}
                />
              </Box>
              <Typography
                marginTop="0px"
                variant="text4"
                sx={InputLabelSubtitle}
              >
                {t(
                  "createMarket.forms.marketDescription.block.withdrawalRequiresAccess.subtitle"
                )}
              </Typography>
            </Box>
          }
          control={
            <StyledSwitch
              checkedColor="orange"
              size="medium"
              checked={withdrawalRequiresAccessWatch}
              onChange={(e) => {
                setValue("withdrawalRequiresAccess", e.target.checked);
              }}
            />
          }
        />
      </Box>

      <Box marginTop="16px">
        <FormControlLabel
          label={
            <Box>
              <Box sx={InputLabelContainer} marginBottom="2px">
                <Box sx={InputLabelTypo}>
                  <Typography variant="text3">
                    {t(
                      "createMarket.forms.marketDescription.block.disableTransfers.title"
                    )}
                  </Typography>
                </Box>
                <TooltipButton
                  value={t(
                    "createMarket.forms.marketDescription.block.disableTransfers.tooltip"
                  )}
                />
              </Box>
              <Typography
                marginTop="0px"
                variant="text4"
                sx={InputLabelSubtitle}
              >
                {t(
                  "createMarket.forms.marketDescription.block.disableTransfers.subtitle"
                )}
              </Typography>
            </Box>
          }
          control={
            <StyledSwitch
              checkedColor="red"
              size="medium"
              checked={disableTransfersWatch}
              onChange={(e) => {
                setValue("disableTransfers", e.target.checked);
              }}
            />
          }
        />
      </Box>

      {!disableTransfersWatch && (
        <Box marginTop="16px">
          <FormControlLabel
            label={
              <Box>
                <Box sx={InputLabelContainer} marginBottom="2px">
                  <Box sx={InputLabelTypo}>
                    <Typography variant="text3">
                      {t(
                        "createMarket.forms.marketDescription.block.transferRequiresAccess.title"
                      )}
                    </Typography>
                  </Box>
                  <TooltipButton
                    value={t(
                      "createMarket.forms.marketDescription.block.transferRequiresAccess.tooltip"
                    )}
                  />
                </Box>
                <Typography
                  marginTop="0px"
                  variant="text4"
                  sx={InputLabelSubtitle}
                >
                  {t(
                    "createMarket.forms.marketDescription.block.transferRequiresAccess.subtitle"
                  )}
                </Typography>
              </Box>
            }
            control={
              <StyledSwitch
                checkedColor="orange"
                size="medium"
                checked={transferRequiresAccessWatch}
                onChange={(e) => {
                  setValue("transferRequiresAccess", e.target.checked);
                }}
              />
            }
          />
        </Box>
      )}

      <Divider sx={DividerStyle} />

      <Box marginBottom="2px" flexDirection="column">
        <Box>
          <Typography variant="text1">
            {t(
              "createMarket.forms.marketDescription.block.borrowerRestrictions.title"
            )}
          </Typography>
        </Box>
        <Typography marginTop="0px" variant="text4" sx={InputLabelSubtitle}>
          {t(
            "createMarket.forms.marketDescription.block.borrowerRestrictions.subtitle"
          )}
        </Typography>
      </Box>

      <Box marginTop="16px">
        <FormControlLabel
          name="allowForceBuyBack"
          label={
            <Box>
              <Box sx={InputLabelContainer} marginBottom="2px">
                <Box sx={InputLabelTypo}>
                  <Typography variant="text3">
                    {t(
                      "createMarket.forms.marketDescription.block.allowForceBuyBack.title"
                    )}
                  </Typography>
                </Box>
                <TooltipButton
                  value={t(
                    "createMarket.forms.marketDescription.block.allowForceBuyBack.tooltip"
                  )}
                />
              </Box>
              <Typography
                marginTop="0px"
                variant="text4"
                sx={InputLabelSubtitle}
              >
                {t(
                  "createMarket.forms.marketDescription.block.allowForceBuyBack.subtitle"
                )}
              </Typography>
            </Box>
          }
          control={
            <StyledSwitch
              checkedColor="red"
              color="info"
              size="medium"
              checked={forceBuyBackWatch}
              onChange={(e) => {
                setValue("allowForceBuyBack", e.target.checked);
              }}
            />
          }
        />
        {forceBuyBackWatch && (
          <Alert variant="outlined" color="warning" severity="warning">
            This will break integration with on-chain exchanges.
            <br />
            Lenders will see a warning about using this market with smart
            contracts.
          </Alert>
        )}
      </Box>

      {isFixedTerm && (
        <Box marginTop="16px">
          <FormControlLabel
            name="allowClosureBeforeTerm"
            label={
              <Box>
                <Box sx={InputLabelContainer} marginBottom="2px">
                  <Box sx={InputLabelTypo}>
                    <Typography variant="text3">
                      {t(
                        "createMarket.forms.marketDescription.block.allowClosureBeforeTerm.title"
                      )}
                    </Typography>
                  </Box>
                  <TooltipButton
                    value={t(
                      "createMarket.forms.marketDescription.block.allowClosureBeforeTerm.tooltip"
                    )}
                  />
                </Box>
                <Typography
                  marginTop="0px"
                  variant="text4"
                  sx={InputLabelSubtitle}
                >
                  {t(
                    "createMarket.forms.marketDescription.block.allowClosureBeforeTerm.subtitle"
                  )}
                </Typography>
              </Box>
            }
            control={
              <StyledSwitch
                color="info"
                size="medium"
                checked={allowClosureBeforeTermWatch}
                onChange={(e) => {
                  setValue("allowClosureBeforeTerm", e.target.checked);
                }}
              />
            }
          />
        </Box>
      )}

      {isFixedTerm && (
        <Box marginTop="16px">
          <FormControlLabel
            name="allowTermReduction"
            label={
              <Box>
                <Box sx={InputLabelContainer} marginBottom="2px">
                  <Box sx={InputLabelTypo}>
                    <Typography variant="text3">
                      {t(
                        "createMarket.forms.marketDescription.block.allowTermReduction.title"
                      )}
                    </Typography>
                  </Box>
                  <TooltipButton
                    value={t(
                      "createMarket.forms.marketDescription.block.allowTermReduction.tooltip"
                    )}
                  />
                </Box>
                <Typography
                  marginTop="0px"
                  variant="text4"
                  sx={InputLabelSubtitle}
                >
                  {t(
                    "createMarket.forms.marketDescription.block.allowTermReduction.subtitle"
                  )}
                </Typography>
              </Box>
            }
            control={
              <StyledSwitch
                color="info"
                size="medium"
                checked={allowTermReductionWatch}
                onChange={(e) => {
                  setValue("allowTermReduction", e.target.checked);
                }}
              />
            }
          />
        </Box>
      )}
      <Box marginTop="16px"></Box>

      <Divider sx={DividerStyle} />

      <Typography variant="text1">
        {t("createMarket.forms.marketDescription.block.title.amountDuties")}
      </Typography>

      <Box marginTop="16px">
        <InputLabel
          label={t("createMarket.forms.marketDescription.block.capacity.title")}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.capacity.tooltip"
          )}
          subtitle={t(
            "createMarket.forms.marketDescription.block.capacity.subtitle"
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.capacity.placeholder"
            )}
            value={getValues("maxTotalSupply")}
            error={Boolean(errors.maxTotalSupply)}
            helperText={errors.maxTotalSupply?.message}
            size="medium"
            style={{ maxWidth: "300px" }}
            thousandSeparator
            endAdornment={
              <TextfieldChip
                text={
                  tokenAsset?.symbol ||
                  `${t(
                    "createMarket.forms.marketDescription.block.capacity.chip"
                  )}`
                }
              />
            }
            onValueChange={(v) => {
              setValue("maxTotalSupply", v.floatValue as number);
            }}
          />
        </InputLabel>
      </Box>
      <Box sx={InputGroupContainer} marginTop="16px">
        <InputLabel
          label={t("createMarket.forms.marketDescription.block.baseAPR.title")}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.baseAPR.tooltip"
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.baseAPR.placeholder"
            )}
            style={{ maxWidth: "300px" }}
            size="medium"
            value={getValues("annualInterestBips")}
            error={Boolean(errors.annualInterestBips)}
            helperText={errors.annualInterestBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t("createMarket.forms.marketDescription.block.baseAPR.chip")}
              </Typography>
            }
            {...register("annualInterestBips")}
          />
        </InputLabel>
        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.penaltyAPR.title"
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.penaltyAPR.tooltip"
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.penaltyAPR.placeholder"
            )}
            style={{ maxWidth: "300px" }}
            size="medium"
            value={getValues("delinquencyFeeBips")}
            error={Boolean(errors.delinquencyFeeBips)}
            helperText={errors.delinquencyFeeBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t(
                  "createMarket.forms.marketDescription.block.penaltyAPR.chip"
                )}
              </Typography>
            }
            {...register("delinquencyFeeBips")}
          />
        </InputLabel>

        <InputLabel
          label={t("createMarket.forms.marketDescription.block.ratio.title")}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.ratio.tooltip"
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.ratio.placeholder"
            )}
            style={{ maxWidth: "300px" }}
            size="medium"
            value={getValues("reserveRatioBips")}
            error={Boolean(errors.reserveRatioBips)}
            helperText={errors.reserveRatioBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t("createMarket.forms.marketDescription.block.ratio.chip")}
              </Typography>
            }
            {...register("reserveRatioBips")}
          />
        </InputLabel>

        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.penaltyAPR.title"
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.penaltyAPR.tooltip"
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.penaltyAPR.placeholder"
            )}
            style={{ maxWidth: "300px" }}
            size="medium"
            value={getValues("delinquencyFeeBips")}
            error={Boolean(errors.delinquencyFeeBips)}
            helperText={errors.delinquencyFeeBips?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t(
                  "createMarket.forms.marketDescription.block.penaltyAPR.chip"
                )}
              </Typography>
            }
            {...register("delinquencyFeeBips")}
          />
        </InputLabel>
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="text1">
        {t("createMarket.forms.marketDescription.block.title.graceWithdrawals")}
      </Typography>

      <Box sx={InputGroupContainer} marginTop="16px">
        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.gracePeriod.title"
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.gracePeriod.tooltip"
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.gracePeriod.placeholder"
            )}
            style={{ maxWidth: "300px" }}
            size="medium"
            value={getValues("delinquencyGracePeriod")}
            error={Boolean(errors.delinquencyGracePeriod)}
            helperText={errors.delinquencyGracePeriod?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t(
                  "createMarket.forms.marketDescription.block.gracePeriod.chip"
                )}
              </Typography>
            }
            {...register("delinquencyGracePeriod")}
          />
        </InputLabel>

        <InputLabel
          label={t(
            "createMarket.forms.marketDescription.block.withdrawalCycle.title"
          )}
          tooltipText={t(
            "createMarket.forms.marketDescription.block.withdrawalCycle.tooltip"
          )}
        >
          <NumberTextField
            label={t(
              "createMarket.forms.marketDescription.block.withdrawalCycle.placeholder"
            )}
            style={{ maxWidth: "300px" }}
            size="medium"
            value={getValues("withdrawalBatchDuration")}
            error={Boolean(errors.withdrawalBatchDuration)}
            helperText={errors.withdrawalBatchDuration?.message}
            endAdornment={
              <Typography variant="text2" sx={endDecorator}>
                {t(
                  "createMarket.forms.marketDescription.block.withdrawalCycle.chip"
                )}
              </Typography>
            }
            {...register("withdrawalBatchDuration")}
          />
        </InputLabel>
      </Box>

      <Box sx={ButtonsContainer}>
        <Link href={ROUTES.borrower.root} passHref>
          <Button size="large" variant="text" sx={BackButton}>
            <SvgIcon fontSize="medium" sx={BackButtonArrow}>
              <BackArrow />
            </SvgIcon>
            {t("createMarket.buttons.back")}
          </Button>
        </Link>

        <Button
          size="large"
          variant="contained"
          sx={NextButton}
          onClick={handleClickNext}
          disabled={!isValid}
        >
          {hideLegalInfoStep
            ? t("createMarket.buttons.confirm")
            : t("createMarket.buttons.next")}
        </Button>
      </Box>
    </Box>
  );
};
