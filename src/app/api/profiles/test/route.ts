import assert from "assert"
import { randomBytes } from "crypto"

import { NextResponse } from "next/server"

import { BorrowerProfile, BorrowerProfileInput } from "../interface"
import { BorrowerProfileUpdate } from "../updates/interface"

export async function GET() {
  const borrowerAddress = `0x${randomBytes(20).toString("hex")}`
  const borrowerProfile: BorrowerProfileInput = {
    address: borrowerAddress,
    name: "Borrower Name",
    description: "Borrower Description",
    founded: "Borrower Founded",
    email: "Borrower Email",
    headquarters: "Borrower Headquarters",
    linkedin: "mylinkedin",
    website: "real-borrower-website.com",
    twitter: "mytwitter",
  }
  /* ========================================================================== */
  /*                         POST /api/profiles/updates                         */
  /* ========================================================================== */
  console.log(
    `Requesting an update to borrower profile that does not exist yet`,
  )
  let postResponse = await fetch(`http://localhost:3000/api/profiles/updates`, {
    method: "POST",
    body: JSON.stringify(borrowerProfile),
    cache: "no-cache",
  }).then((r) => r.json())
  assert(postResponse.success === true, "Failed to create borrower profile")
  const updateId1 = postResponse.updateId

  /* ========================================================================== */
  /*                         GET /api/profiles/[address]                        */
  /* ========================================================================== */
  console.log(`Querying for borrower profile before changes are accepted`)
  const { profile: returnedProfile } = await fetch(
    `http://localhost:3000/api/profiles/${borrowerAddress}`,
    {
      cache: "no-cache",
    },
  ).then((r) => r.json())
  if (returnedProfile) {
    console.log(returnedProfile)
  }
  assert.equal(returnedProfile, null, `Profile should not exist yet`)

  /* ========================================================================== */
  /*            GET /api/profiles/updates?borrower=${borrowerAddress}           */
  /* ========================================================================== */
  console.log(`Querying for all updates to borrower profile`)
  let pendingUpdates = (await fetch(
    `http://localhost:3000/api/profiles/updates?borrower=${borrowerAddress}`,
    {
      cache: "no-cache",
    },
  ).then((r) => r.json())) as BorrowerProfileUpdate[]
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
  postResponse = await fetch(`http://localhost:3000/api/profiles/updates`, {
    method: "POST",
    body: JSON.stringify(borrowerProfile),
    cache: "no-cache",
  }).then((r) => r.json())
  assert(postResponse.success === true, "Failed to update borrower profile")
  assert(
    postResponse.updateId === updateId1 + 1,
    `Update id should be ${updateId1 + 1}`,
  )

  /* ========================================================================== */
  /*                         GET /api/profiles/[address]                        */
  /* ========================================================================== */
  console.log(`Querying pending updates`)

  pendingUpdates = (await fetch(
    `http://localhost:3000/api/profiles/updates?borrower=${borrowerAddress}`,
  ).then((r) => r.json())) as BorrowerProfileUpdate[]
  assert.equal(
    pendingUpdates.length,
    1,
    `Should still have one pending update for borrower`,
  )
  const [{ updateId, update: pendingUpdate }] = pendingUpdates
  assert.equal(updateId, updateId1 + 1, `Update id should be ${updateId1 + 1}`)
  assert.deepStrictEqual(
    pendingUpdate,
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
    profile: { updatedAt, ...acceptedProfile },
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
