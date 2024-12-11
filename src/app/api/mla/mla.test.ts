// /**
//  * @jest-environment node
//  */

// // eslint-disable-next-line import/no-extraneous-dependencies
// import { randomBytes } from "crypto"

// import { Wallet } from "ethers"
// import { RequestInit } from "next/dist/server/web/spec-extension/request"
// import { NextRequest } from "next/server"
// // import { Body, createMocks, createRequest } from "node-mocks-http"

// import { TargetChainId } from "@/config/network"
// import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
// import { getProviderForServer } from "@/lib/provider"

// import { GET as getMla, POST as postMla } from "./[market]/route"
// import { GET as getAllMlaTemplates } from "./templates/route"
// import { POST as postLogin } from "../auth/login/route"
// import {
//   AcceptInvitationInput,
//   BorrowerInvitationInput,
// } from "../invite/interface"
// import {
//   GET as getBorrowerInvites,
//   POST as postBorrowerInvite,
//   DELETE as deleteBorrowerInvite,
//   PUT as putBorrowerInvite,
// } from "../invite/route"

// export const mockPut = (
//   path: string,
//   body: unknown = null,
//   otherOptions: Omit<RequestInit, "body"> = {},
// ): NextRequest =>
//   new NextRequest(`http://localhost:3000${path}`, {
//     method: "PUT",
//     body: body ? JSON.stringify(body) : null,
//     ...otherOptions,
//   })

// export const mockPost = (
//   path: string,
//   body: unknown = null,
//   otherOptions: Omit<RequestInit, "body"> = {},
// ): NextRequest =>
//   new NextRequest(`http://localhost:3000${path}`, {
//     method: "POST",
//     body: body ? JSON.stringify(body) : null,
//     ...otherOptions,
//   })
// export const mockGet = (
//   path: string,
//   otherOptions: RequestInit = {},
// ): NextRequest =>
//   new NextRequest(`http://localhost:3000${path}`, {
//     method: "GET",
//     ...otherOptions,
//   })

// describe("API", () => {
//   const provider = getProviderForServer()
//   const wallet = new Wallet(process.env.TEST_BORROWER_PRIVATE_KEY!, provider)

//   const borrowerAddress = wallet.address as `0x${string}`

//   const invite: BorrowerInvitationInput = {
//     address: borrowerAddress,
//     name: "Borrower 1",
//   }

//   describe("/api/auth/login", () => {
//     test("[POST] Fails if no signature", async () => {
//       const req = mockPost("/api/auth/login", {
//         address: borrowerAddress,
//       })

//       const response = await postLogin(req)
//       expect(response.status).toBe(400)
//       expect(await response.json()).toEqual({ error: "Invalid signature" })
//     })
//   })

//   describe("/api/invite", () => {
//     test("[POST] Creates invitation", async () => {
//       const req = mockPost("/api/invite", invite)
//       const response = await postBorrowerInvite(req)
//       expect(response.status).toBe(200)
//       expect(await response.json()).toEqual({ success: true })
//     })

//     test("[POST] Creates profile with name", async () => {
//       const req = mockGet(`/api/profiles/${borrowerAddress}`)
//       const response = await getProfile(req, {
//         params: { address: borrowerAddress },
//       })
//       expect(response.status).toBe(200)
//       expect(await response.json()).toEqual({
//         profile: {
//           address: borrowerAddress.toLowerCase(),
//           chainId: TargetChainId,
//           name: "Borrower 1",
//           registeredOnChain: false,
//         },
//       })
//     })

//     test("[POST] Fails if parameter missing", async () => {
//       const req = mockPost("/api/invite", { inviter: borrowerAddress })
//       const response = await postBorrowerInvite(req)
//       expect(response.status).toBe(400)
//       expect(await response.json()).toHaveProperty("errors")
//     })

//     test("[POST] Fails if invitation already exists", async () => {
//       const req = mockPost("/api/invite", invite)
//       const response = await postBorrowerInvite(req)
//       expect(response.status).toBe(400)
//       expect(await response.json()).toEqual({
//         error: `An invitation for ${borrowerAddress.toLowerCase()} already exists`,
//       })
//     })

//     test("[PUT] Fails if invitation does not exist", async () => {
//       const dateSigned = new Date().toISOString()
//       const wallet2 = Wallet.createRandom({ provider })
//       const body: AcceptInvitationInput = {
//         address: wallet2.address as `0x${string}`,
//         name: invite.name,
//         dateSigned,
//         signature: "0x",
//       }
//       const req = mockPut(`/api/invite/${wallet2.address}`, body)
//       const response = await putBorrowerInvite(req)
//       expect(response.status).toBe(404)
//       expect(await response.json()).toEqual({
//         error: `Pending borrower invitation not found for ${wallet2.address.toLowerCase()}`,
//       })
//     })

//     test("[PUT] Fails if EOA signature is from other account", async () => {
//       let agreementText = AgreementText
//       const dateSigned = new Date().toISOString()
//       if (dateSigned) {
//         agreementText = `${agreementText}\n\nDate: ${dateSigned}`
//       }
//       agreementText = `${agreementText}\n\nOrganization Name: ${invite.name}`
//       const wallet2 = Wallet.createRandom({ provider })
//       const body: AcceptInvitationInput = {
//         address: borrowerAddress,
//         name: invite.name,
//         dateSigned,
//         signature: await wallet2.signMessage(agreementText),
//       }
//       const req = mockPut(`/api/invite/${borrowerAddress}`, body)
//       const response = await putBorrowerInvite(req)
//       expect(response.status).toBe(400)
//       expect(await response.json()).toEqual({ error: "Invalid signature" })
//     })

//     test("[PUT] Accepts EOA signature", async () => {
//       let agreementText = AgreementText
//       const dateSigned = new Date().toISOString()
//       if (dateSigned) {
//         agreementText = `${agreementText}\n\nDate: ${dateSigned}`
//       }
//       agreementText = `${agreementText}\n\nOrganization Name: ${invite.name}`
//       const body: AcceptInvitationInput = {
//         address: borrowerAddress,
//         name: invite.name,
//         dateSigned,
//         signature: await wallet.signMessage(agreementText),
//       }
//       const req = mockPut(`/api/invite/${borrowerAddress}`, body)
//       const response = await putBorrowerInvite(req)
//       expect(response.status).toBe(200)
//       expect(await response.json()).toEqual({ success: true })
//     })
//   })
// })
