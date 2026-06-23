import { NON_MLA_ACKNOWLEDGEMENT_TEXT } from "@/config/non-mla-acknowledgement"

export const buildNonMlaAcknowledgementText = ({
  market,
  chainId,
}: {
  market: string
  chainId: number
}) =>
  NON_MLA_ACKNOWLEDGEMENT_TEXT.replace(
    "{{market}}",
    market.toLowerCase(),
  ).replace("{{chainId}}", chainId.toString())
