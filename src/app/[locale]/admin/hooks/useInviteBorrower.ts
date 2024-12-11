import { useMutation } from "@tanstack/react-query"

import { BorrowerInvitationInput } from "@/app/api/invite/interface"
import { useAuthToken } from "@/hooks/useApiAuth"

export const useInviteBorrower = () => {
  const token = useAuthToken()
  const { mutateAsync: inviteBorrower } = useMutation({
    mutationFn: async (data: BorrowerInvitationInput) => {
      const response = await fetch("/api/invite/borrower", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json())
      if (!response.success) {
        throw new Error("Failed to invite borrower")
      }
      return response.json()
    },
  })
}
