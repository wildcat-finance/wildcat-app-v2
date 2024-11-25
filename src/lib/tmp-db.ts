import { existsSync, readFileSync, writeFileSync } from "fs"
import path from "path"

import {
  BorrowerProfile,
  BorrowerProfileInput,
} from "@/app/api/borrower-profile/interface"
import {
  BorrowerProfileUpdate,
  BorrowerProfileUpdateResponse,
} from "@/app/api/borrower-profile/updates/interface"

type TmpDbData = {
  nextUpdateId: number
  profiles: {
    [address: string]: BorrowerProfile
  }
  updates: {
    [address: string]: BorrowerProfileUpdate[]
  }
}

export const TMP_BORROWER_DB_PATH = path.join(__dirname, `tmp-borrower-db.json`)

const getDb = (): TmpDbData => {
  if (!existsSync(TMP_BORROWER_DB_PATH)) {
    return {
      nextUpdateId: 1,
      profiles: {},
      updates: {},
    }
  }
  return JSON.parse(readFileSync(TMP_BORROWER_DB_PATH, "utf8")) as TmpDbData
}

const writeDb = (db: TmpDbData): void => {
  const data = JSON.stringify(db, null, 2)
  writeFileSync(TMP_BORROWER_DB_PATH, data)
}

export function getBorrowerProfile(
  address: string,
): BorrowerProfile | undefined {
  const db = getDb()
  return db.profiles[address.toLowerCase()]
}

export function getAllBorrowerProfiles(): BorrowerProfile[] {
  const db = getDb()
  return Object.values(db.profiles)
}

export function putBorrowerProfile(profile: BorrowerProfileInput): void {
  const db = getDb()
  db.profiles[profile.address.toLowerCase()] = {
    ...profile,
    updatedAt: Date.now(),
  }
  writeDb(db)
}

export function getBorrowerProfileUpdates(
  address: string,
): BorrowerProfileUpdate[] {
  const db = getDb()
  return db.updates[address.toLowerCase()] || []
}

export function getAllBorrowerProfileUpdates(): BorrowerProfileUpdate[] {
  const db = getDb()
  return Object.values(db.updates).flat()
}

export function putBorrowerProfileUpdate(
  update: BorrowerProfileInput,
): BorrowerProfileUpdate {
  const { address } = update
  const db = getDb()
  const updates =
    db.updates[address.toLowerCase()] ||
    (db.updates[address.toLowerCase()] = [])

  // If there is already a pending update, merge the data from the new one into
  // it and replace the id and created at timestamp
  if (updates.length > 0) {
    const lastUpdate = updates[updates.length - 1]
    if (!lastUpdate.acceptedAt && !lastUpdate.rejectedAt) {
      lastUpdate.update = {
        ...lastUpdate.update,
        ...update,
      }
      lastUpdate.createdAt = Date.now()
      lastUpdate.updateId = db.nextUpdateId
      db.nextUpdateId += 1
      db.updates[address.toLowerCase()] = updates
      writeDb(db)
      console.log(`wrote db with 2nd update`)
      return lastUpdate
    }
  }
  updates.push({
    update,
    updateId: db.nextUpdateId,
    createdAt: Date.now(),
  })
  db.nextUpdateId += 1
  console.log(`wrote db with new update`)
  writeDb(db)
  return updates[updates.length - 1]
}

export function putBorrowerProfileUpdateResponse({
  borrower,
  updateId,
  accept,
  rejectedReason,
}: BorrowerProfileUpdateResponse): void {
  const db = getDb()
  const updates = db.updates[borrower.toLowerCase()]
  if (!updates) {
    return
  }
  const update = updates.find((u) => u.updateId === updateId)
  if (!update) {
    throw new Error(
      `update not found for id ${updateId} and borrower ${borrower}!`,
    )
  }
  if (accept) {
    update.acceptedAt = Date.now()
    db.profiles[borrower.toLowerCase()] = {
      ...(db.profiles[borrower.toLowerCase()] || {}),
      ...update.update,
      updatedAt: Date.now(),
    }
  } else {
    update.rejectedAt = Date.now()
    update.rejectedReason = rejectedReason
  }
  const priorIncompleteUpdates = updates.filter(
    (u) => !u.acceptedAt && !u.rejectedAt && u.updateId !== updateId,
  )
  priorIncompleteUpdates.forEach((priorUpdate) => {
    priorUpdate.rejectedAt = Date.now()
    priorUpdate.rejectedReason = "Overridden by later update"
  })
  writeDb(db)
}
