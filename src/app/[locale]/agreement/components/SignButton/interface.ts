import { SignatureSubmissionInput } from "@/app/[locale]/agreement/interface"

export type SignButtonProps = {
  submitSignature: (
    input: SignatureSubmissionInput,
    network: string,
  ) => Promise<void>
}
