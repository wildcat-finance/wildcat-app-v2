"use client"

import { useState } from "react"

import { Box, Button, Stack, TextField, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import {
  getDeploymentAddress,
  getKycEnrollmentTimestamp,
  getRoleProviderAuthority,
  hasDeploymentAddress,
  prepareAddRoleProviderMembers,
  prepareRemoveRoleProviderMembers,
  type SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"
import { type Address, getAddress, isAddress, zeroAddress } from "viem"

import { AuthorityStatus } from "@/components/RoleProviders/AuthorityStatus"
import { useRoleProviderAdmin } from "@/hooks/useRoleProviderAdmin"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useSubgraphClient } from "@/providers/SubgraphProvider"

function KycMembers({
  chainId,
  contract,
}: {
  chainId: SupportedChainId
  contract: Address
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState("")
  const account =
    isAddress(input) && input !== zeroAddress ? getAddress(input) : undefined
  const admin = useRoleProviderAdmin(chainId, contract, "kyc")
  const { provider, canWrite, transaction } = admin
  const graph = useSubgraphClient()
  const members = useQuery({
    queryKey: ["roleProvider", chainId, contract, "members"],
    enabled: canWrite,
    queryFn: async () => {
      const data = await getRoleProviderAuthority(graph, contract, {
        fetchPolicy: "network-only",
      })
      if (data?.kind !== "kyc")
        throw Error("Shared KYC provider is not indexed")
      return data.members
        .filter((member) => member.isMember)
        .map((member) => member.account)
    },
    refetchInterval: 15_000,
  })
  const enrollment = useQuery({
    queryKey: ["roleProvider", chainId, contract, "enrollment", account],
    enabled: !!account && !!provider && canWrite,
    queryFn: () => getKycEnrollmentTimestamp(provider!, contract, account!),
    refetchInterval: 15_000,
  })
  const known = enrollment.isSuccess && enrollment.data !== undefined
  const enrolled = known && enrollment.data > BigInt(0)
  let enrollmentText = t("common.kyc.checking")
  if (enrollment.isError) enrollmentText = t("admin.kyc.lookupError")
  else if (enrolled)
    enrollmentText = t("admin.kyc.enrolledSince", {
      date: new Date(Number(enrollment.data) * 1000).toISOString(),
    })
  else if (known) enrollmentText = t("admin.kyc.unlisted")
  const select = (value: string) => {
    transaction.reset()
    setInput(value.trim())
  }
  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
        {t("admin.kyc.providerAddress", { address: contract })}
      </Typography>
      <AuthorityStatus admin={admin} />
      {canWrite && (
        <>
          <TextField
            label={t("admin.kyc.wallet")}
            value={input}
            disabled={transaction.isPending}
            error={!!input && !account}
            helperText={
              input && !account ? t("common.kyc.invalidAddress") : undefined
            }
            onChange={(event) => select(event.target.value)}
          />
          {account && (
            <Typography role={enrollment.isError ? "alert" : "status"}>
              {enrollmentText}
            </Typography>
          )}
          <Button
            variant="contained"
            disabled={!known || !account || transaction.isPending}
            onClick={() => {
              if (!account || !known) return
              const prepare = enrolled
                ? prepareRemoveRoleProviderMembers
                : prepareAddRoleProviderMembers
              transaction.mutate(prepare(contract, [account]))
            }}
          >
            {enrolled ? t("admin.kyc.removeWallet") : t("admin.kyc.addWallet")}
          </Button>
          <Typography component="h2" variant="h6">
            {t("admin.kyc.members")}
          </Typography>
          <Typography variant="body2">{t("admin.kyc.indexDelay")}</Typography>
          {members.isError && (
            <Typography role="alert">{t("admin.kyc.listError")}</Typography>
          )}
          {members.isPending && (
            <Typography role="status">
              {t("admin.kyc.loadingMembers")}
            </Typography>
          )}
          {members.isSuccess && members.data.length === 0 && (
            <Typography>{t("admin.kyc.empty")}</Typography>
          )}
          {members.isSuccess && members.data.length > 0 && (
            <Box component="ul" sx={{ pl: 2, overflowWrap: "anywhere" }}>
              {members.data.map((member) => (
                <li key={member}>
                  <Button
                    variant="text"
                    disabled={transaction.isPending}
                    onClick={() => select(member)}
                  >
                    {member}
                  </Button>
                </li>
              ))}
            </Box>
          )}
        </>
      )}
    </Stack>
  )
}

export default function KycAdminPage() {
  const { t } = useTranslation()
  const { chainId } = useSelectedNetwork()
  return (
    <Stack spacing={3} sx={{ maxWidth: 720, p: { xs: 2, md: 5 } }}>
      <Typography component="h1" variant="h4">
        {t("admin.kyc.adminTitle")}
      </Typography>
      {hasDeploymentAddress(chainId, "KYCRoleProvider") ? (
        <KycMembers
          key={chainId}
          chainId={chainId}
          contract={getAddress(
            getDeploymentAddress(chainId, "KYCRoleProvider"),
          )}
        />
      ) : (
        <Typography>{t("admin.kyc.unsupported")}</Typography>
      )}
    </Stack>
  )
}
