import { Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import type { useRoleProviderAdmin } from "@/hooks/useRoleProviderAdmin"
import { COLORS } from "@/theme/colors"

export function AuthorityStatus({
  admin,
}: {
  admin: ReturnType<typeof useRoleProviderAdmin>
}) {
  const { t } = useTranslation()
  const {
    authority,
    actor,
    correctChain,
    canWrite,
    transaction,
    transactionError,
  } = admin
  if (transactionError)
    return (
      <Typography variant="text3" color={COLORS.wildWatermelon} role="alert">
        {transactionError}
      </Typography>
    )
  let message
  if (!actor) message = t("common.kyc.connect")
  else if (!correctChain) message = t("common.kyc.network")
  else if (authority.isError)
    return (
      <Typography variant="text3" color={COLORS.wildWatermelon} role="alert">
        {t("common.kyc.authorityError")}
      </Typography>
    )
  else if (!authority.data) message = t("common.kyc.checkingAuthority")
  else if (!canWrite)
    message = t("common.kyc.adminOnly", { address: authority.data })
  else if (transaction.isPending) message = t("common.kyc.pending")
  else if (transaction.isSuccess) message = t("common.kyc.confirmed")
  return message ? (
    <Typography variant="text3" role="status" sx={{ overflowWrap: "anywhere" }}>
      {message}
    </Typography>
  ) : null
}
