import { Button, useTheme } from "@mui/material"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import type { ServiceAgreementPartyInput } from "@/app/api/service-agreement/interface"
import { useAcceptToU } from "@/hooks/useToUReacceptance"

/// Party-aware re-acceptance CTA for accounts that signed an older ToU version
/// or declined the current one. Same flow as the re-acceptance modal (borrower
/// accounts sign with their organization name); the legacy SignButton stays
/// lender-only for first-time onboarding and its old-table dual-write.
export const ReacceptButton = ({
  party,
}: {
  party: ServiceAgreementPartyInput
}) => {
  const theme = useTheme()
  const { t } = useTranslation()
  const router = useRouter()
  const accept = useAcceptToU(party)

  const handleSign = () => {
    // Return to where the user came from (re-acceptance modal, create-market
    // blocker), mirroring the legacy SignButton's post-sign navigation.
    accept.mutate(undefined, { onSuccess: () => router.back() })
  }

  return (
    <Button
      variant="contained"
      size="large"
      sx={{
        width: "168.63px",
        height: "44px",
        [theme.breakpoints.down("md")]: {
          width: "100%",
        },
      }}
      onClick={handleSign}
      disabled={accept.isPending || !accept.isReady}
    >
      {accept.isPending
        ? t("common.buttons.signing")
        : t("agreement.signButton.reaccept")}
    </Button>
  )
}
