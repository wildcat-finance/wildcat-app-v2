import assert from "assert"
import { randomBytes } from "crypto"

import { NextResponse } from "next/server"

import { TargetChainId } from "@/config/network"

import {
  BorrowerInvitation,
  BorrowerInvitationInput,
} from "../../invite/interface"
import { BorrowerProfile } from "../interface"
import { BorrowerProfileUpdate } from "../updates/interface"

const postUrl = <T>(url: string, body: T) =>
  fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    cache: "no-cache",
  }).then((r) => r.json())

const getUrl = (url: string) =>
  fetch(url, { cache: "no-cache" }).then((r) => r.json())

/// Flow:
/// 1. Borrower is invited by an admin, creating a borrower profile.
/// 2. Borrower updates their profile.

export async function GET() {
  const borrowerAddress = `0x${randomBytes(20).toString("hex")}`
  const borrowerProfile: BorrowerProfile = {
    address: borrowerAddress,
    chainId: TargetChainId,
    name: "Borrower Name",
    description: "Borrower Description",
    founded: "Borrower Founded",
    email: "Borrower Email",
    headquarters: "Borrower Headquarters",
    linkedin: "mylinkedin",
    website: "real-borrower-website.com",
    twitter: "mytwitter",
    registeredOnChain: false,
  }
  const expectedBorrowerProfile: BorrowerProfile = {
    address: borrowerAddress,
    chainId: TargetChainId,
    registeredOnChain: false,
    name: "Borrower 1",
  }
  const expectedInvite: BorrowerInvitationInput = {
    address: borrowerAddress,
    inviter: borrowerAddress,
    name: "Borrower 1",
  }
  /* ========================================================================== */
  /*                              POST /api/invite                              */
  /* ========================================================================== */
  console.log(`Creating a new invite for borrower`)
  let postResponse = await postUrl(
    `http://localhost:3000/api/invite`,
    expectedInvite,
  )
  assert(postResponse.success === true, "Failed to create invite")

  /* ========================================================================== */
  /*                               GET /api/invite                              */
  /* ========================================================================== */

  console.log(`Querying for all invites`)
  const allInvites = (await getUrl(
    `http://localhost:3000/api/invite`,
  )) as BorrowerInvitation[]
  const { address, chainId, inviter, name } = allInvites[allInvites.length - 1]
  assert.deepStrictEqual(
    { address, chainId, inviter, name },
    { ...expectedInvite, chainId: TargetChainId },
    `Latest invite should match expected borrower profile`,
  )

  console.log(`Querying for invite by address`)
  const invitesByAddress = (await getUrl(
    `http://localhost:3000/api/invite?address=${borrowerAddress}`,
  )) as BorrowerInvitation[]
  const { id, timeInvited, ...mostOfInvite } = invitesByAddress[0]
  assert.deepStrictEqual(
    mostOfInvite,
    { ...expectedInvite, chainId: TargetChainId },
    `Invite by address should match expected borrower profile`,
  )

  const getProfile = async (addr: string) => {
    const { profile } = (await getUrl(
      `http://localhost:3000/api/profiles/${addr}`,
    )) as { profile: BorrowerProfile }
    return profile
  }

  console.log(`Invite should have created a borrower profile`)
  console.log(await getProfile(borrowerAddress))
  assert.deepStrictEqual(
    await getProfile(borrowerAddress),
    expectedBorrowerProfile,
    `Profile should match expected borrower profile`,
  )

  /* ========================================================================== */
  /*                         POST /api/profiles/updates                         */
  /* ========================================================================== */
  console.log(`Requesting an update to borrower profile`)
  postResponse = await postUrl(
    `http://localhost:3000/api/profiles/updates`,
    borrowerProfile,
  )
  assert(postResponse.success === true, "Failed to create borrower profile")
  const updateId1 = postResponse.updateId

  console.log(`Request does not immediately update borrower profile`)
  assert.deepStrictEqual(
    await getProfile(borrowerAddress),
    expectedBorrowerProfile,
    `Profile should not have changed yet`,
  )

  /* ========================================================================== */
  /*            GET /api/profiles/updates?borrower=${borrowerAddress}           */
  /* ========================================================================== */
  console.log(`Querying for all updates to borrower profile`)
  let pendingUpdates = (await getUrl(
    `http://localhost:3000/api/profiles/updates?borrower=${borrowerAddress}`,
  )) as BorrowerProfileUpdate[]
  assert.equal(
    pendingUpdates.length,
    1,
    `Should have one pending update for borrower`,
  )

  /* ========================================================================== */
  /*                          GET /api/profiles/updates                         */
  /* ========================================================================== */
  console.log(`Querying for all updates to all borrower profiles`)
  const allUpdates = (await fetch(
    `http://localhost:3000/api/profiles/updates`,
  ).then((r) => r.json())) as BorrowerProfileUpdate[]
  assert.equal(
    new Set(allUpdates.map((u) => u.updateId)).size,
    allUpdates.length,
    `All updates should have unique ids`,
  )
  assert(
    allUpdates.some((u) => u.updateId === updateId1),
    `All updates should include the new update`,
  )

  /* ========================================================================== */
  /*                         POST /api/profiles/updates                         */
  /* ========================================================================== */
  console.log(
    `Making changes to a pending update by requesting second update before it is accepted/rejected`,
  )
  borrowerProfile.name = "Updated Borrower Name"
  postResponse = await postUrl(
    `http://localhost:3000/api/profiles/updates`,
    borrowerProfile,
  )
  assert(postResponse.success === true, "Failed to update borrower profile")
  assert(
    postResponse.updateId === updateId1 + 1,
    `Update id should be ${updateId1 + 1}`,
  )

  /* ========================================================================== */
  /*                         GET /api/profiles/[address]                        */
  /* ========================================================================== */
  console.log(`Querying pending updates`)
  pendingUpdates = await getUrl(
    `http://localhost:3000/api/profiles/updates?borrower=${borrowerAddress}`,
  )
  assert.equal(
    pendingUpdates.length,
    1,
    `Should still have one pending update for borrower`,
  )
  const [{ updateId, update: pendingUpdate }] = pendingUpdates
  console.log(pendingUpdate)
  assert.equal(updateId, updateId1 + 1, `Update id should be ${updateId1 + 1}`)
  assert.deepStrictEqual(
    {
      ...pendingUpdate,
      registeredOnChain: false,
    },
    borrowerProfile,
    `Pending update should match new borrower profile`,
  )

  /* ========================================================================== */
  /*                          PUT /api/profiles/updates                         */
  /* ========================================================================== */
  console.log(`Calling admin route to accept a borrower profile update`)

  const putResponse = await fetch(
    `http://localhost:3000/api/profiles/updates`,
    {
      method: "PUT",
      body: JSON.stringify({
        updateId,
        accept: true,
        borrower: borrowerAddress,
      }),
      cache: "no-cache",
    },
  ).then((r) => r.json())
  assert(putResponse.success === true, "Failed to accept borrower profile")

  /* ========================================================================== */
  /*                         GET /api/profiles/[address]                        */
  /* ========================================================================== */
  console.log(`Querying for borrower profile after update is accepted`)

  const {
    profile: { ...acceptedProfile },
  } = (await fetch(
    `http://localhost:3000/api/profiles/${borrowerAddress}`,
  ).then((r) => r.json())) as { profile: BorrowerProfile }
  assert.deepStrictEqual(
    acceptedProfile,
    borrowerProfile,
    `Accepted profile should match new borrower profile`,
  )

  const allProfiles = (await fetch(`http://localhost:3000/api/profiles`).then(
    (r) => r.json(),
  )) as BorrowerProfile[]
  assert(
    allProfiles.some(
      (p) => p.address.toLowerCase() === borrowerAddress.toLowerCase(),
    ),
    `All profiles should include the new profile`,
  )
  return NextResponse.json({ success: true })
}

export const dynamic = "force-dynamic"
