import { useState } from "react"

import { Button, Stack, TextField, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import {
  getDeploymentAddress,
  hasDeploymentAddress,
  iOpenTermHooksAbi,
  type Market,
  prepareAddHookRoleProvider,
  prepareRemoveHookRoleProvider,
} from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"
import { type Address, getAddress, isAddress, zeroAddress } from "viem"

import { useRoleProviderAdmin } from "@/hooks/useRoleProviderAdmin"

import { AuthorityStatus } from "./AuthorityStatus"

function ProviderEditor({
  market,
  hooks,
  kyc,
}: {
  market: Market
  hooks: Address
  kyc: Address
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState<string>(kyc)
  const [ttlDraft, setTtlDraft] = useState<string>()
  const selected =
    isAddress(input) && input !== zeroAddress ? getAddress(input) : undefined
  const admin = useRoleProviderAdmin(market.chainId, hooks, "hooks")
  const { publicClient, transaction, canWrite } = admin
  const attachment = useQuery({
    queryKey: ["roleProvider", market.chainId, hooks, "attachment", selected],
    enabled: !!publicClient && !!selected,
    queryFn: async () => {
      const word = await publicClient!.readContract({
        address: hooks,
        abi: iOpenTermHooksAbi,
        functionName: "getRoleProvider",
        args: [selected!],
      })
      // RoleProvider packs its uint32 TTL in the top four bytes. Zero means absent.
      return word === BigInt(0) ? null : Number(word / BigInt(2) ** BigInt(224))
    },
    refetchInterval: 15_000,
  })
  const attached = typeof attachment.data === "number"
  const ttl = ttlDraft ?? String(attachment.data ?? 0)
  const validTtl = /^\d+$/.test(ttl) && Number(ttl) <= 0xffffffff
  const ready =
    canWrite && !!selected && attachment.isSuccess && !transaction.isPending
  const choose = (value: string) => {
    setInput(value.trim())
    setTtlDraft(undefined)
    transaction.reset()
  }
  const currentProviders = (market.roleProviders ?? []).filter(
    (provider) => provider.isApproved,
  )
  const openAccess = getDeploymentAddress(
    market.chainId,
    "OpenAccessRoleProvider",
  ).toLowerCase()
  const depositsOpen =
    !market.hooksConfig?.flags.useOnDeposit ||
    !market.hooksConfig.depositRequiresAccess ||
    currentProviders.some(
      (provider) =>
        provider.isPullProvider &&
        provider.providerAddress.toLowerCase() === openAccess,
    )
  let status = t("common.kyc.checking")
  if (attachment.isError) status = t("borrower.kyc.attachmentError")
  else if (attached)
    status = t("borrower.kyc.attached", { seconds: attachment.data })
  else if (attachment.isSuccess) status = t("borrower.kyc.detached")
  return (
    <Stack spacing={2} sx={{ mt: 4 }}>
      <Typography component="h2" variant="h5">
        {t("borrower.kyc.providers")}
      </Typography>
      <Typography>{t("borrower.kyc.policyScope")}</Typography>
      <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
        {t("borrower.kyc.policyAddress", { address: hooks })}
      </Typography>
      <AuthorityStatus admin={admin} />
      {depositsOpen && (
        <Typography>{t("borrower.kyc.openDeposits")}</Typography>
      )}
      {currentProviders.length > 0 && (
        <Stack spacing={1} alignItems="flex-start">
          <Typography component="h3" variant="subtitle1">
            {t("borrower.kyc.current")}
          </Typography>
          {currentProviders.map((item) => (
            <Button
              key={item.providerAddress}
              variant="text"
              disabled={transaction.isPending}
              onClick={() => choose(item.providerAddress)}
            >
              {item.providerAddress}
            </Button>
          ))}
        </Stack>
      )}
      <TextField
        label={t("borrower.kyc.provider")}
        value={input}
        onChange={(event) => choose(event.target.value)}
        disabled={transaction.isPending}
        error={!!input && !selected}
        helperText={
          input && !selected
            ? t("common.kyc.invalidAddress")
            : t("borrower.kyc.sharedAddress", { address: kyc })
        }
      />
      {selected && (
        <Typography role={attachment.isError ? "alert" : "status"}>
          {status}
        </Typography>
      )}
      {canWrite && (
        <>
          <TextField
            label={t("borrower.kyc.ttl")}
            value={ttl}
            disabled={transaction.isPending}
            inputProps={{ inputMode: "numeric" }}
            error={!validTtl}
            helperText={
              validTtl
                ? t("borrower.kyc.ttlHelp")
                : t("borrower.kyc.invalidTtl")
            }
            onChange={(event) => setTtlDraft(event.target.value)}
          />
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              disabled={
                !ready ||
                !validTtl ||
                (attached && Number(ttl) === attachment.data)
              }
              onClick={() =>
                selected &&
                transaction.mutate(
                  prepareAddHookRoleProvider(hooks, selected, Number(ttl)),
                )
              }
            >
              {attached
                ? t("borrower.kyc.updateTtl")
                : t("borrower.kyc.attach")}
            </Button>
            {attached && (
              <Button
                variant="outlined"
                disabled={!ready}
                onClick={() =>
                  selected &&
                  transaction.mutate(
                    prepareRemoveHookRoleProvider(hooks, selected),
                  )
                }
              >
                {t("borrower.kyc.detach")}
              </Button>
            )}
          </Stack>
        </>
      )}
    </Stack>
  )
}

export function MarketRoleProviders({ market }: { market: Market }) {
  const hooks = market.hooksConfig?.hooksAddress
  if (!hooks || !hasDeploymentAddress(market.chainId, "KYCRoleProvider"))
    return null
  return (
    <ProviderEditor
      key={`${market.chainId}-${hooks}`}
      market={market}
      hooks={getAddress(hooks)}
      kyc={getAddress(getDeploymentAddress(market.chainId, "KYCRoleProvider"))}
    />
  )
}
