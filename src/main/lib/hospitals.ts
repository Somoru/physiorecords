import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'
import type { DeleteHospitalResult, Hospital, HospitalSummary } from '../../shared/types'
import { atomicWriteJson, pathExists, readJson } from './atomicWrite'
import { hospitalsDir, hospitalDir, hospitalJsonPath, patientsDir, toFolderName } from './paths'

async function uniqueFolderName(rootPath: string, desired: string): Promise<string> {
  const base = toFolderName(desired)
  let candidate = base
  let n = 2
  while (await pathExists(hospitalDir(rootPath, candidate))) {
    candidate = `${base} (${n})`
    n++
  }
  return candidate
}

export async function listHospitals(rootPath: string): Promise<HospitalSummary[]> {
  const dir = hospitalsDir(rootPath)
  if (!(await pathExists(dir))) return []

  const entries = await fs.readdir(dir, { withFileTypes: true })
  const summaries: HospitalSummary[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const hospital = await readJson<Hospital>(hospitalJsonPath(rootPath, entry.name))
    if (!hospital) continue

    let patientCount = 0
    const pDir = patientsDir(rootPath, entry.name)
    if (await pathExists(pDir)) {
      const patientEntries = await fs.readdir(pDir, { withFileTypes: true })
      patientCount = patientEntries.filter((e) => e.isDirectory()).length
    }

    summaries.push({ ...hospital, folderName: entry.name, patientCount })
  }

  summaries.sort((a, b) => a.name.localeCompare(b.name))
  return summaries
}

export async function createHospital(rootPath: string, name: string): Promise<HospitalSummary> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Hospital name is required.')

  const folderName = await uniqueFolderName(rootPath, trimmed)
  const now = new Date().toISOString()
  const hospital: Hospital = { id: randomUUID(), name: trimmed, createdAt: now }

  await fs.mkdir(patientsDir(rootPath, folderName), { recursive: true })
  await atomicWriteJson(hospitalJsonPath(rootPath, folderName), hospital)

  return { ...hospital, folderName, patientCount: 0 }
}

export async function renameHospital(
  rootPath: string,
  folderName: string,
  newName: string
): Promise<HospitalSummary> {
  const trimmed = newName.trim()
  if (!trimmed) throw new Error('Hospital name is required.')

  const jsonPath = hospitalJsonPath(rootPath, folderName)
  const hospital = await readJson<Hospital>(jsonPath)
  if (!hospital) throw new Error('Hospital not found.')

  hospital.name = trimmed
  await atomicWriteJson(jsonPath, hospital)

  const pDir = patientsDir(rootPath, folderName)
  const patientCount = (await pathExists(pDir))
    ? (await fs.readdir(pDir, { withFileTypes: true })).filter((e) => e.isDirectory()).length
    : 0

  return { ...hospital, folderName, patientCount }
}

export async function deleteHospital(rootPath: string, folderName: string): Promise<DeleteHospitalResult> {
  const pDir = patientsDir(rootPath, folderName)
  if (await pathExists(pDir)) {
    const patientCount = (await fs.readdir(pDir, { withFileTypes: true })).filter((e) => e.isDirectory()).length
    if (patientCount > 0) {
      return { ok: false, reason: 'has-patients', patientCount }
    }
  }

  await fs.rm(hospitalDir(rootPath, folderName), { recursive: true, force: true })
  return { ok: true }
}
