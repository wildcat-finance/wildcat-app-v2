import { gql } from "@apollo/client"

export const BORROWER_REGISTRATION_CHANGE_SUBSCRIPTION = gql`
  subscription {
    borrowerRegistrationChanges {
      blockNumber
    }
  }
`
