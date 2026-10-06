import { createClient } from "@supabase/supabase-js"

import { getExportStorageConfig } from "../config"

const getStorage = () => {
  const { url, serviceRoleKey, bucket } = getExportStorageConfig()
  return { client: createClient(url, serviceRoleKey), bucket }
}

export async function putExportObject(
  key: string,
  data: Buffer,
  contentType: string,
  upsert = false,
) {
  const { client, bucket } = getStorage()
  const { error } = await client.storage.from(bucket).upload(key, data, {
    contentType,
    upsert,
  })
  if (error)
    throw new Error(`Failed to upload export object ${key}: ${error.message}`)
  return key
}

export async function getExportObject(key: string) {
  const { client, bucket } = getStorage()
  const { data, error } = await client.storage.from(bucket).download(key)
  if (error)
    throw new Error(`Failed to download export object ${key}: ${error.message}`)
  return Buffer.from(await data.arrayBuffer())
}

export async function exportObjectExists(key: string) {
  const { client, bucket } = getStorage()
  const slash = key.lastIndexOf("/")
  const prefix = slash === -1 ? "" : key.slice(0, slash)
  const name = slash === -1 ? key : key.slice(slash + 1)
  const { data, error } = await client.storage.from(bucket).list(prefix, {
    search: name,
    limit: 1,
  })
  if (error)
    throw new Error(`Failed to inspect export object ${key}: ${error.message}`)
  return data.some((item) => item.name === name)
}

export async function createExportDownloadUrl(key: string) {
  const { client, bucket } = getStorage()
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(key, 3600)
  if (error)
    throw new Error(`Failed to sign export object ${key}: ${error.message}`)
  return data.signedUrl
}

export async function removeExportObjects(keys: string[]) {
  if (keys.length === 0) return
  const { client, bucket } = getStorage()
  const { error } = await client.storage.from(bucket).remove(keys)
  if (error)
    throw new Error(`Failed to remove export objects: ${error.message}`)
}
