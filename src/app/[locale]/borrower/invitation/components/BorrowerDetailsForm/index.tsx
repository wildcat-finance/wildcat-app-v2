// import { useState } from "react"

// import { Box, TextField, Typography } from "@mui/material"

// import { InputLabel } from "@/components/InputLabel"

// import { InputGroupContainer } from "../../../create-market/components/NewMarketForm/style"

// type InitialBorrowerDetails = {
//   name: string
//   jurisdiction?: string
//   physicalAddress?: string
//   email?: string
//   entityKind?: string
// }

// export const BorrowerDetailsForm = ({
//   initialValues,
// }: {
//   initialValues: InitialBorrowerDetails
// }) => {
//   const [name, setName] = useState(initialValues.name)
//   const [jurisdiction, setJurisdiction] = useState(initialValues.jurisdiction)
//   const [physicalAddress, setPhysicalAddress] = useState(
//     initialValues.physicalAddress,
//   )
//   const [email, setEmail] = useState(initialValues.email)
//   const [entityKind, setEntityKind] = useState(initialValues.entityKind)

//   return (
//     <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
//       <Typography variant="h4">Confirm Your Details</Typography>
//       <Box sx={InputGroupContainer}>
//         <InputLabel label="Organization Name" tooltipText="Organization Name">
//           <TextField
//             label="Organization Name"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             fullWidth
//           />
//         </InputLabel>
//       </Box>
//       <Box sx={InputGroupContainer}>
//         <InputLabel label="Jurisdiction" tooltipText="Jurisdiction">
//           <TextField
//             label="Jurisdiction"
//             value={jurisdiction}
//             onChange={(e) => setJurisdiction(e.target.value)}
//             fullWidth
//           />
//         </InputLabel>
//       </Box>
//       <Box sx={InputGroupContainer}>
//         <InputLabel label="Entity Kind" tooltipText="Entity Kind">
//           <TextField
//             label="Entity Kind"
//             value={entityKind}
//             onChange={(e) => setEntityKind(e.target.value)}
//             fullWidth
//           />
//         </InputLabel>
//       </Box>

//       <Box sx={InputGroupContainer}>
//         <InputLabel label="Physical Address" tooltipText="Physical Address">
//           <TextField
//             label="Physical Address"
//             value={physicalAddress}
//             onChange={(e) => setPhysicalAddress(e.target.value)}
//             fullWidth
//           />
//         </InputLabel>
//       </Box>
//       <Box sx={InputGroupContainer}>
//         <InputLabel label="Email" tooltipText="Email">
//           <TextField
//             label="Email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             fullWidth
//           />
//         </InputLabel>
//       </Box>
//     </Box>
//   )
// }
