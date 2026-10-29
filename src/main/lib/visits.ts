import { promises as fs } from 'fs'
import type { Visit } from '../../shared/types'
import { atomicWriteJson, pathExists, readJson } from './atomicWrite'
import { visitsDir, visitJsonPath } from './paths'

export async function listVisits(rootPath: string, hospitalFolderName: string, patientId: string): Promise<Visit[]> {
  const dir = visitsDir(rootPath, hospitalFolderName, patientId)
  if (!(await pathExists(dir))) return []

  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'))
  const visits: Visit[] = []
  for (const file of files) {
    const visit = await readJson<Visit>(`${dir}/${file}`)
    if (visit) visits.push(visit)
  }
  visits.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  return visits
}

async function nextVisitId(rootPath: string, hospitalFolderName: string, patientId: string): Promise<string> {
  const dir = visitsDir(rootPath, hospitalFolderName, patientId)
  let maxN = 0
  if (await pathExists(dir)) {
    for (const file of await fs.readdir(dir)) {
      const match = file.match(/^visit-(\d+)\.json$/)
      if (match) maxN = Math.max(maxN, parseInt(match[1], 10))
    }
  }
  return `visit-${String(maxN + 1).padStart(4, '0')}`
}

export async function createVisit(
  rootPath: string,
  hospitalFolderName: string,
  patientId: string,
  data: { date: string; notes: string; fields: Record<string, unknown> }
): Promise<Visit> {
  const id = await nextVisitId(rootPath, hospitalFolderName, patientId)
  const visit: Visit = {
    id,
    date: data.date,
    notes: data.notes,
    fields: data.fields,
    createdAt: new Date().toISOString()
  }
  await atomicWriteJson(visitJsonPath(rootPath, hospitalFolderName, patientId, id), visit)
  return visit
}
