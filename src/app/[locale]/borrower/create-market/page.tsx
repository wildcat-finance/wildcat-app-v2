"use client"

import { useMemo } from "react"

import { Box, Typography } from "@mui/material"
import { HooksKind } from "@wildcatfi/wildcat-sdk"

import { MarketPolicyForm } from "@/app/[locale]/borrower/create-market/components/Forms/MarketPolicyForm"
import { GlossarySidebar } from "@/app/[locale]/borrower/create-market/components/GlossarySidebar"
import { useNewMarketForm } from "@/app/[locale]/borrower/new-market/hooks/useNewMarketForm"
import { useNewMarketHooksData } from "@/app/[locale]/borrower/new-market/hooks/useNewMarketHooksData"
import { useAppSelector } from "@/store/hooks"
import { CreateMarketSteps } from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"
import { COLORS } from "@/theme/colors"

const CreateMarketStepCounter = ({
  current,
  total,
}: {
  current: number
  total: number
}) => (
  <Box
    sx={{
      height: "fit-content",
      display: "flex",
      gap: "6px",
      alignItems: "center",
      marginBottom: "12px",
    }}
  >
    <Typography variant="text3" color={COLORS.santasGrey}>
      Creating a New Market
    </Typography>

    <Box
      sx={{
        width: "3px",
        height: "3px",
        borderRadius: "50%",
        backgroundColor: COLORS.santasGrey,
      }}
    />

    <Typography variant="text3" color={COLORS.santasGrey}>
      {`${current}/${total}`}
    </Typography>
  </Box>
)

const policyGlossary = [
  {
    title: "Market Policy",
    description:
      "Rules defining loan type (open or fixed) and access requirements.",
  },
  {
    title: "Policy Name",
    description: "The name of the market’s rule set.",
  },
]

export default function CreateMarketPage() {
  const currentStep = useAppSelector(
    (state) => state.createMarketSidebar.currentStep,
  )

  const steps = useAppSelector((state) => state.createMarketSidebar.steps)

  const currentNumber = steps.find((step) => step.step === currentStep)?.number

  const defaultPolicyOption = {
    id: "createNewPolicy",
    label: "Create New Policy",
    value: "createNewPolicy",
  } as const

  const newMarketForm = useNewMarketForm()

  const {
    selectedHooksInstance,
    selectedHooksTemplate,
    hooksKind,
    hooksInstances,
    hooksTemplates,
    isLoading: isHooksLoading,
  } = useNewMarketHooksData(newMarketForm)

  const policyOptions = useMemo(
    () => [
      defaultPolicyOption,
      ...(hooksInstances?.map((instance) => ({
        id: instance.address,
        label: instance.name || "Unnamed Policy",
        badge:
          instance.kind === HooksKind.OpenTerm ? "Open Term" : "Fixed Term",
        value: instance.address,
      })) ?? []),
    ],
    [hooksInstances],
  )

  return (
    <Box
      sx={{
        width: "100%",
        height: "calc(100vh - 43px - 43px - 52px)",
        display: "flex",
        justifyContent: "space-between",
        overflow: "hidden",
        overflowY: "visible",
      }}
    >
      <Box
        sx={{
          width: "100%",
          padding: "40px 100px 0",
        }}
      >
        {currentNumber && (
          <CreateMarketStepCounter
            current={currentNumber}
            total={steps.length - 1}
          />
        )}

        {currentStep === CreateMarketSteps.POLICY && (
          <MarketPolicyForm
            form={newMarketForm}
            policyOptions={policyOptions}
          />
        )}
      </Box>

      {currentNumber && <GlossarySidebar stepNumber={currentNumber} />}
    </Box>
  )
}
