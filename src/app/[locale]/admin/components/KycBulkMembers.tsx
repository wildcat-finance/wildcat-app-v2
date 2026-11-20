"use client"

import { useMemo, useState } from "react"

import { Button, Stack, TextField, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import {
  kycRoleProviderAbi,
  prepareAddRoleProviderMembers,
  prepareRemoveRoleProviderMembers,
  type SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"
import { type Address, getAddress, isAddress, zeroAddress } from "viem"

import { InputLabel } from "@/components/InputLabel"
import type { useRoleProviderAdmin } from "@/hooks/useRoleProviderAdmin"
import { COLORS } from "@/theme/colors"
import { getContractErrorName } from "@/utils/contractErrors"

export const MAX_KYC_BATCH = 100
export type KycBatchAction = "add" | "remove"

// The contract rejects the whole batch for any of these, so no wallet changes.
const BATCH_REVERT_KEY: Record<string, string> = {
  MemberAlreadyExists: "admin.kyc.bulk.alreadyEnrolled",
  MemberNotFound: "admin.kyc.bulk.notEnrolled",
  InvalidMember: "admin.kyc.bulk.zeroAddress",
}

const SHOWN_INVALID = 5

const parseWallets = (text: string) => {
  const accounts: Address[] = []
  const invalid: string[] = []
  let duplicates = 0
  text
    .split(/[\s,;]+/)
    .filter(Boolean)
    .forEach((entry) => {
      const account = isAddress(entry) ? getAddress(entry) : undefined
      if (!account || account === zeroAddress) invalid.push(entry)
      // A repeated entry would revert the batch.
      else if (accounts.includes(account)) duplicates += 1
      else accounts.push(account)
    })
  return { accounts, invalid, duplicates }
}

export function KycBulkMembers({
  chainId,
  contract,
  admin,
  action,
  onSubmit,
}: {
  chainId: SupportedChainId
  contract: Address
  admin: ReturnType<typeof useRoleProviderAdmin>
  /** Set while the latest transaction is a batch sent from this form. */
  action?: KycBatchAction
  onSubmit: (action: KycBatchAction) => void
}) {
  const { t } = useTranslation()
  const { publicClient, canWrite, transaction, transactionError } = admin
  const [text, setText] = useState("")
  const { accounts, invalid, duplicates } = useMemo(
    () => parseWallets(text),
    [text],
  )
  const tooMany = accounts.length > MAX_KYC_BATCH
  const lookup = useQuery({
    queryKey: ["roleProvider", chainId, contract, "batch", accounts],
    enabled:
      canWrite &&
      !!publicClient &&
      accounts.length > 0 &&
      invalid.length === 0 &&
      !tooMany,
    queryFn: () =>
      publicClient!.multicall({
        allowFailure: false,
        contracts: accounts.map(
          (account) =>
            ({
              address: contract,
              abi: kycRoleProviderAbi,
              functionName: "addedAt",
              args: [account],
            }) as const,
        ),
      }),
    refetchInterval: 15_000,
  })
  // Send only wallets the batch can change: one already in the target state reverts it all.
  const timestamps = lookup.data
  const enrolled = timestamps
    ? accounts.filter((_, index) => timestamps[index] > BigInt(0))
    : []
  const absent = timestamps
    ? accounts.filter((_, index) => timestamps[index] === BigInt(0))
    : []

  const send = (next: KycBatchAction) => {
    const members = next === "add" ? absent : enrolled
    if (!members.length) return
    const prepare =
      next === "add"
        ? prepareAddRoleProviderMembers
        : prepareRemoveRoleProviderMembers
    onSubmit(next)
    // A rejected batch usually means the list changed after it was checked.
    transaction.mutate(prepare(contract, members), {
      onError: () => lookup.refetch(),
    })
  }

  let problem: string | undefined
  if (invalid.length)
    problem = t("admin.kyc.bulk.invalid", {
      count: invalid.length,
      entries: `${invalid
        .slice(0, SHOWN_INVALID)
        .map((entry) => (entry.length > 44 ? `${entry.slice(0, 44)}…` : entry))
        .join(", ")}${invalid.length > SHOWN_INVALID ? ", …" : ""}`,
    })
  else if (tooMany)
    problem = t("admin.kyc.bulk.tooMany", {
      max: MAX_KYC_BATCH,
      count: accounts.length,
    })
  else if (lookup.isError) problem = t("admin.kyc.bulk.lookupError")

  let failure: string | undefined
  if (action && transaction.isError) {
    const key =
      BATCH_REVERT_KEY[
        getContractErrorName(transaction.error, kycRoleProviderAbi) ?? ""
      ]
    failure = key ? t(key) : transactionError
  }
  let progress: string | undefined
  if (action && transaction.isPending) progress = t("common.kyc.pending")
  else if (action && transaction.isSuccess) progress = t("common.kyc.confirmed")

  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="title3">
        {t("admin.kyc.bulk.title")}
      </Typography>
      <Typography variant="text3">
        {t("admin.kyc.bulk.help", { max: MAX_KYC_BATCH })}
      </Typography>
      <InputLabel
        htmlFor="kyc-batch-wallets"
        label={t("admin.kyc.bulk.wallets")}
      >
        <TextField
          id="kyc-batch-wallets"
          multiline
          minRows={3}
          maxRows={8}
          placeholder={t("admin.kyc.bulk.placeholder")}
          // The theme pins text fields to one line and MUI pads a multiline root for a floating label.
          sx={{
            height: "auto",
            "& .MuiInputBase-root": { height: "auto", padding: "0 10px 0 0" },
          }}
          value={text}
          disabled={transaction.isPending}
          error={invalid.length > 0 || tooMany}
          onChange={(event) => {
            transaction.reset()
            setText(event.target.value)
          }}
        />
      </InputLabel>
      {problem && (
        <Typography
          variant="text3"
          color={COLORS.wildWatermelon}
          role="alert"
          sx={{ overflowWrap: "anywhere" }}
        >
          {problem}
        </Typography>
      )}
      {!problem && accounts.length > 0 && (
        <Typography variant="text3" role="status">
          {timestamps
            ? t("admin.kyc.bulk.summary", {
                total: accounts.length,
                absent: absent.length,
                enrolled: enrolled.length,
              })
            : t("common.kyc.checking")}
          {duplicates > 0 &&
            ` ${t("admin.kyc.bulk.duplicates", { count: duplicates })}`}
        </Typography>
      )}
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={!!problem || !absent.length || transaction.isPending}
          onClick={() => send("add")}
        >
          {t("admin.kyc.bulk.add", { count: absent.length })}
        </Button>
        <Button
          variant="outlined"
          disabled={!!problem || !enrolled.length || transaction.isPending}
          onClick={() => send("remove")}
        >
          {t("admin.kyc.bulk.remove", { count: enrolled.length })}
        </Button>
      </Stack>
      {failure && (
        <Typography
          variant="text3"
          color={COLORS.wildWatermelon}
          role="alert"
          sx={{ overflowWrap: "anywhere" }}
        >
          {failure}
        </Typography>
      )}
      {progress && (
        <Typography variant="text3" role="status">
          {progress}
        </Typography>
      )}
    </Stack>
  )
}
