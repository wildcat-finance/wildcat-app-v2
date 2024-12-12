import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import infoValidationSchema, {
  InfoValidationSchemaType,
} from "@/app/[locale]/borrower/create-market/validation/validationSchema"

export const useLegalInfoForm = () =>
  useForm<InfoValidationSchemaType>({
    resolver: zodResolver(infoValidationSchema),
    mode: "onChange",
  })
