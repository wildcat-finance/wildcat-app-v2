import { Button, useTheme } from "@mui/material"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import type { ServiceAgreementPartyInput } from "@/app/api/service-agreement/interface"
import { useAcceptToU } from "@/hooks/useToUReacceptance"
import { currentReturnTarget } from "@/utils/returnTarget"

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
    // blocker), mirroring SignButton's post-sign navigation. The destination
    // is the validated target carried on the URL, falling back to the party
    // root, so a successful re-acceptance never leaves the application.
    accept.mutate(undefined, {
      onSuccess: () => router.replace(currentReturnTarget(party)),
    })
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
