import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import {
  infoValidationSchema,
  InfoValidationSchemaType,
} from "../validation/validationSchema"

export const useLegalInfoForm = () =>
  useForm<InfoValidationSchemaType>({
    resolver: zodResolver(infoValidationSchema),
    mode: "onChange",
  })
