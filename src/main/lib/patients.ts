import { promises as fs } from 'fs'
import type { Patient, PatientWithHospital } from '../../shared/types'
import { atomicWriteJson, pathExists, readJson } from './atomicWrite'
import { patientsDir, patientDir, patientJsonPath, hospitalsDir } from './paths'
import { syncPatientExcel } from './excelSync'

export async function listPatients(rootPath: string, hospitalFolderName: string): Promise<Patient[]> {
  const dir = patientsDir(rootPath, hospitalFolderName)
  if (!(await pathExists(dir))) return []

  const entries = await fs.readdir(dir, { withFileTypes: true })
  const patients: Patient[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const patient = await readJson<Patient>(patientJsonPath(rootPath, hospitalFolderName, entry.name))
    if (patient) patients.push(patient)
  }
  patients.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return patients
}

export async function listAllPatients(rootPath: string): Promise<PatientWithHospital[]> {
  const dir = hospitalsDir(rootPath)
  if (!(await pathExists(dir))) return []

  const hospitalFolders = (await fs.readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory())
  const all: PatientWithHospital[] = []
  for (const h of hospitalFolders) {
    const patients = await listPatients(rootPath, h.name)
    all.push(...patients.map((p) => ({ ...p, hospitalFolderName: h.name })))
  }
  return all
}

export async function getPatient(
  rootPath: string,
  hospitalFolderName: string,
  patientId: string
): Promise<Patient | null> {
  return readJson<Patient>(patientJsonPath(rootPath, hospitalFolderName, patientId))
}

async function nextPatientId(rootPath: string, hospitalFolderName: string): Promise<string> {
  const dir = patientsDir(rootPath, hospitalFolderName)
  let maxN = 0
  if (await pathExists(dir)) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const match = entry.name.match(/^PAT-(\d+)$/)
      if (match) maxN = Math.max(maxN, parseInt(match[1], 10))
    }
  }
  return `PAT-${String(maxN + 1).padStart(4, '0')}`
}

export async function createPatient(
  rootPath: string,
  hospitalFolderName: string,
  hospitalId: string,
  templateId: string,
  templateVersion: number,
  fields: Record<string, unknown>
): Promise<Patient> {
  const id = await nextPatientId(rootPath, hospitalFolderName)
  const now = new Date().toISOString()
  const patient: Patient = {
    id,
    templateId,
    templateVersion,
    hospitalId,
    createdAt: now,
    updatedAt: now,
    fields,
    status: 'active'
  }

  await fs.mkdir(patientDir(rootPath, hospitalFolderName, id), { recursive: true })
  await atomicWriteJson(patientJsonPath(rootPath, hospitalFolderName, id), patient)
  await syncPatientExcel(rootPath, hospitalFolderName, id)
  return patient
}

export async function updatePatient(
  rootPath: string,
  hospitalFolderName: string,
  patientId: string,
  fields: Record<string, unknown>
): Promise<Patient> {
  const existing = await getPatient(rootPath, hospitalFolderName, patientId)
  if (!existing) throw new Error('Patient not found.')

  const updated: Patient = {
    ...existing,
    fields: { ...existing.fields, ...fields },
    updatedAt: new Date().toISOString()
  }
  await atomicWriteJson(patientJsonPath(rootPath, hospitalFolderName, patientId), updated)
  await syncPatientExcel(rootPath, hospitalFolderName, patientId)
  return updated
}

export async function deletePatient(
  rootPath: string,
  hospitalFolderName: string,
  patientId: string
): Promise<void> {
  await fs.rm(patientDir(rootPath, hospitalFolderName, patientId), { recursive: true, force: true })
}

export async function getFieldSuggestions(
  rootPath: string,
  hospitalFolderName: string,
  fieldId: string
): Promise<string[]> {
  const patients = await listPatients(rootPath, hospitalFolderName)
  const values = new Set<string>()
  for (const p of patients) {
    const v = p.fields[fieldId]
    if (typeof v === 'string' && v.trim()) values.add(v.trim())
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b))
}

export async function rebuildAllExcel(rootPath: string): Promise<number> {
  const all = await listAllPatients(rootPath)
  for (const p of all) {
    await syncPatientExcel(rootPath, p.hospitalFolderName, p.id)
  }
  return all.length
}
