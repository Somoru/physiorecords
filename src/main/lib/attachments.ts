import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'
import { basename, extname, join } from 'path'
import type { Attachment } from '../../shared/types'
import { atomicWriteJson, pathExists, readJson } from './atomicWrite'
import { attachmentsDir, attachmentsManifestPath } from './paths'

interface ManifestFile {
  attachments: Attachment[]
}

async function readManifest(rootPath: string, hospitalFolderName: string, patientId: string): Promise<Attachment[]> {
  const data = await readJson<ManifestFile>(attachmentsManifestPath(rootPath, hospitalFolderName, patientId))
  return data?.attachments ?? []
}

async function writeManifest(
  rootPath: string,
  hospitalFolderName: string,
  patientId: string,
  attachments: Attachment[]
): Promise<void> {
  await atomicWriteJson(attachmentsManifestPath(rootPath, hospitalFolderName, patientId), {
    attachments
  } satisfies ManifestFile)
}

export async function listAttachments(
  rootPath: string,
  hospitalFolderName: string,
  patientId: string
): Promise<Attachment[]> {
  return readManifest(rootPath, hospitalFolderName, patientId)
}

async function uniqueFilename(dir: string, desired: string): Promise<string> {
  const ext = extname(desired)
  const base = basename(desired, ext)
  let candidate = desired
  let n = 2
  while (await pathExists(join(dir, candidate))) {
    candidate = `${base} (${n})${ext}`
    n++
  }
  return candidate
}

export async function addAttachment(
  rootPath: string,
  hospitalFolderName: string,
  patientId: string,
  sourceFilePath: string,
  notes: string
): Promise<Attachment> {
  const dir = attachmentsDir(rootPath, hospitalFolderName, patientId)
  await fs.mkdir(dir, { recursive: true })

  const filename = await uniqueFilename(dir, basename(sourceFilePath))
  await fs.copyFile(sourceFilePath, join(dir, filename))

  const attachment: Attachment = {
    id: randomUUID(),
    filename,
    notes,
    addedAt: new Date().toISOString()
  }

  const attachments = await readManifest(rootPath, hospitalFolderName, patientId)
  attachments.push(attachment)
  await writeManifest(rootPath, hospitalFolderName, patientId, attachments)
  return attachment
}

export async function removeAttachment(
  rootPath: string,
  hospitalFolderName: string,
  patientId: string,
  attachmentId: string
): Promise<void> {
  const attachments = await readManifest(rootPath, hospitalFolderName, patientId)
  const target = attachments.find((a) => a.id === attachmentId)
  if (!target) return

  const dir = attachmentsDir(rootPath, hospitalFolderName, patientId)
  await fs.rm(join(dir, target.filename), { force: true })
  await writeManifest(
    rootPath,
    hospitalFolderName,
    patientId,
    attachments.filter((a) => a.id !== attachmentId)
  )
}
