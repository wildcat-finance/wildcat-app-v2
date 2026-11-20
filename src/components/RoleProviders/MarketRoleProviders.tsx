import { useState } from "react"

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import {
  getDeploymentAddress,
  hasDeploymentAddress,
  iOpenTermHooksAbi,
  type HooksInstance,
  prepareAddHookRoleProvider,
  prepareRemoveHookRoleProvider,
} from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"
import { getAddress, isAddress, parseAbi, zeroAddress } from "viem"

import { InputLabel } from "@/components/InputLabel"
import { useRoleProviderAdmin } from "@/hooks/useRoleProviderAdmin"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"
import { getProviderLabelKey } from "@/utils/marketCapabilities"

import { AuthorityStatus } from "./AuthorityStatus"

const providerAbi = parseAbi(["function isPullProvider() view returns (bool)"])
type Policy = Pick<HooksInstance, "chainId" | "address" | "roleProviders">

export function MarketRoleProviders({ policy }: { policy: Policy }) {
  const { t } = useTranslation()
  const { chainId } = policy
  const hooks = getAddress(policy.address)
  const known = ["KYCRoleProvider", "OpenAccessRoleProvider"] as const
  const attachedProviders = policy.roleProviders.filter(
    (provider) => provider.isApproved,
  )
  const choices = Array.from(
    new Set([
      ...known
        .filter((name) => hasDeploymentAddress(chainId, name))
        .map((name) => getAddress(getDeploymentAddress(chainId, name))),
      ...attachedProviders.map(({ providerAddress }) =>
        getAddress(providerAddress),
      ),
    ]),
  )
  const label = (address: string) => {
    const provider = attachedProviders.find(
      (item) => item.providerAddress.toLowerCase() === address.toLowerCase(),
    )
    const key = getProviderLabelKey(chainId, address, provider?.kind)
    return key ? `${t(key)} (${trimAddress(address)})` : address
  }
  const [choice, setChoice] = useState<string>(choices[0] ?? "custom")
  const [input, setInput] = useState("")
  const [ttlDraft, setTtlDraft] = useState<string>()
  const [confirmRemoval, setConfirmRemoval] = useState(false)
  const address = choice === "custom" ? input : choice
  const selected =
    isAddress(address) && address !== zeroAddress
      ? getAddress(address)
      : undefined
  const admin = useRoleProviderAdmin(chainId, hooks, "hooks")
  const { publicClient, transaction, canWrite } = admin
  const attachment = useQuery({
    queryKey: ["roleProvider", chainId, hooks, "attachment", selected],
    enabled: !!publicClient && !!selected,
    queryFn: async (): Promise<{
      ttl: number | null
      kind: "pull" | "push" | "no-code"
    }> => {
      const word = await publicClient!.readContract({
        address: hooks,
        abi: iOpenTermHooksAbi,
        functionName: "getRoleProvider",
        args: [selected!],
      })
      if (word !== BigInt(0)) {
        // The policy fixes the provider type at attachment. Historical push providers can be EOAs.
        const uint24 = BigInt(2) ** BigInt(24)
        const pullIndex = (word / BigInt(2) ** BigInt(40)) % uint24
        const pull = pullIndex !== uint24 - BigInt(1)
        return {
          ttl: Number(word / BigInt(2) ** BigInt(224)),
          kind: pull ? "pull" : "push",
        }
      }
      const code = await publicClient!.getBytecode({ address: selected! })
      if (!code || code === "0x") return { ttl: null, kind: "no-code" }
      const pull = await publicClient!.readContract({
        address: selected!,
        abi: providerAbi,
        functionName: "isPullProvider",
        account: hooks,
      })
      return { ttl: null, kind: pull ? "pull" : "push" }
    },
    refetchInterval: 15_000,
  })
  const current = attachment.data
  const attached = current?.ttl != null
  const ttl =
    ttlDraft ?? String(current?.ttl ?? (current?.kind === "push" ? "" : 0))
  const validTtl = /^\d+$/.test(ttl) && Number(ttl) <= 0xffffffff
  const ready =
    canWrite &&
    selected &&
    attachment.isSuccess &&
    current?.kind !== "no-code" &&
    !transaction.isPending
  let status = t("common.kyc.checking")
  if (current?.ttl != null) {
    const lifetime =
      current.ttl === 0 && current.kind === "pull"
        ? t("common.kyc.checkedOnUse")
        : humanizeDuration(current.ttl * 1000, {
            largest: 2,
            round: true,
            units: ["y", "d", "h", "m", "s"],
          })
    status = t("borrower.kyc.attached", { lifetime })
  } else if (attachment.isSuccess) status = t("borrower.kyc.detached")
  const reset = () => {
    setTtlDraft(undefined)
    setConfirmRemoval(false)
    transaction.reset()
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 640, py: 3, overflowWrap: "anywhere" }}>
      <Typography component="h2" variant="title2">
        {t("borrower.kyc.providers")}
      </Typography>
      <Typography variant="text2">{t("borrower.kyc.policyScope")}</Typography>
      <Typography variant="text3">
        {t("borrower.kyc.policyAddress", { address: hooks })}
      </Typography>
      <AuthorityStatus admin={admin} />
      <Typography component="h3" variant="title3">
        {t("borrower.kyc.current")}
      </Typography>
      {attachedProviders.length ? (
        <Stack component="ul" spacing={0.5} sx={{ pl: 2 }}>
          {attachedProviders.map(({ providerAddress }) => (
            <Typography
              component="li"
              variant="text3"
              key={providerAddress}
              title={providerAddress}
            >
              {label(providerAddress)}
            </Typography>
          ))}
        </Stack>
      ) : (
        <Typography variant="text3">{t("borrower.kyc.noneIndexed")}</Typography>
      )}
      {canWrite && (
        <>
          <InputLabel
            htmlFor="policy-provider-choice"
            label={t("borrower.kyc.selectProvider")}
          >
            <Select
              id="policy-provider-choice"
              labelId="policy-provider-choice-label"
              value={choice}
              disabled={transaction.isPending}
              onChange={(event) => {
                setChoice(event.target.value)
                reset()
              }}
            >
              {choices.map((item) => (
                <MenuItem key={item} value={item}>
                  {label(item)}
                </MenuItem>
              ))}
              {choice !== "custom" &&
                !choices.some((item) => item === choice) && (
                  <MenuItem value={choice}>{label(choice)}</MenuItem>
                )}
              <MenuItem value="custom">{t("borrower.kyc.custom")}</MenuItem>
            </Select>
          </InputLabel>
          {choice === "custom" && (
            <InputLabel
              htmlFor="policy-provider-address"
              label={t("borrower.kyc.provider")}
            >
              <TextField
                id="policy-provider-address"
                sx={{ height: "auto" }}
                placeholder={t("common.kyc.addressPlaceholder")}
                value={input}
                disabled={transaction.isPending}
                error={!!input && !selected}
                helperText={
                  input && !selected
                    ? t("common.kyc.invalidAddress")
                    : t("borrower.kyc.customHelp")
                }
                onChange={(event) => {
                  setInput(event.target.value.trim())
                  reset()
                }}
              />
            </InputLabel>
          )}
          {selected &&
            (attachment.isError || current?.kind === "no-code" ? (
              <Typography
                variant="text3"
                color={COLORS.wildWatermelon}
                role="alert"
              >
                {attachment.isError
                  ? t("borrower.kyc.attachmentError")
                  : t("borrower.kyc.noCode")}
              </Typography>
            ) : (
              <Typography variant="text3" role="status">
                {status}
              </Typography>
            ))}
          {current?.kind === "pull" && choice === "custom" && (
            <Typography variant="text3">
              {t("borrower.kyc.pullNotice")}
            </Typography>
          )}
          {current?.kind === "push" && (
            <Typography variant="text3">
              {t("borrower.kyc.pushNotice")}
            </Typography>
          )}
          <InputLabel
            htmlFor="policy-provider-ttl"
            label={t("borrower.kyc.ttl")}
          >
            <TextField
              id="policy-provider-ttl"
              sx={{ height: "auto" }}
              placeholder={t("borrower.kyc.ttlPlaceholder")}
              value={ttl}
              disabled={transaction.isPending}
              inputProps={{ inputMode: "numeric" }}
              error={!!ttl && !validTtl}
              helperText={
                ttl && !validTtl
                  ? t("borrower.kyc.invalidTtl")
                  : t("borrower.kyc.ttlHelp")
              }
              onChange={(event) => setTtlDraft(event.target.value)}
            />
          </InputLabel>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              disabled={!ready || !validTtl || Number(ttl) === current?.ttl}
              onClick={() =>
                ready &&
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
                onClick={() => setConfirmRemoval(true)}
              >
                {t("borrower.kyc.detach")}
              </Button>
            )}
          </Stack>
          <Dialog
            open={confirmRemoval && attached}
            onClose={() => setConfirmRemoval(false)}
            aria-labelledby="remove-provider-title"
          >
            <DialogTitle id="remove-provider-title" variant="title3">
              {t("borrower.kyc.detach")}
            </DialogTitle>
            <DialogContent>
              <Typography variant="text2" sx={{ overflowWrap: "anywhere" }}>
                {t("borrower.kyc.confirmRemove", {
                  provider: selected,
                  policy: hooks,
                })}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button autoFocus onClick={() => setConfirmRemoval(false)}>
                {t("common.buttons.cancel")}
              </Button>
              <Button
                variant="contained"
                disabled={!ready || !attached}
                onClick={() => {
                  if (!ready || !attached) return
                  setConfirmRemoval(false)
                  transaction.mutate(
                    prepareRemoveHookRoleProvider(hooks, selected),
                  )
                }}
              >
                {t("common.buttons.confirm")}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Stack>
  )
}
