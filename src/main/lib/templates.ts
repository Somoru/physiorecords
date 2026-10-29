import { randomUUID } from 'crypto'
import type { DeleteTemplateResult, Template, TemplateSection } from '../../shared/types'
import { atomicWriteJson, readJson } from './atomicWrite'
import { templatesPath } from './paths'
import { listAllPatients } from './patients'

interface TemplatesFile {
  templates: Template[]
}

async function readTemplates(rootPath: string): Promise<Template[]> {
  const data = await readJson<TemplatesFile>(templatesPath(rootPath))
  return data?.templates ?? []
}

async function writeTemplates(rootPath: string, templates: Template[]): Promise<void> {
  await atomicWriteJson(templatesPath(rootPath), { templates } satisfies TemplatesFile)
}

export async function listTemplates(rootPath: string): Promise<Template[]> {
  return readTemplates(rootPath)
}

export async function createTemplate(
  rootPath: string,
  name: string,
  sections: TemplateSection[]
): Promise<Template> {
  const templates = await readTemplates(rootPath)
  const now = new Date().toISOString()
  const template: Template = {
    id: randomUUID(),
    name: name.trim() || 'Untitled Template',
    version: 1,
    sections,
    createdAt: now,
    updatedAt: now
  }
  templates.push(template)
  await writeTemplates(rootPath, templates)
  return template
}

export async function updateTemplate(
  rootPath: string,
  templateId: string,
  updates: { name?: string; sections?: TemplateSection[] }
): Promise<Template> {
  const templates = await readTemplates(rootPath)
  const idx = templates.findIndex((t) => t.id === templateId)
  if (idx === -1) throw new Error('Template not found.')

  const existing = templates[idx]
  const changed =
    (updates.name !== undefined && updates.name !== existing.name) ||
    (updates.sections !== undefined && JSON.stringify(updates.sections) !== JSON.stringify(existing.sections))

  const updated: Template = {
    ...existing,
    name: updates.name?.trim() || existing.name,
    sections: updates.sections ?? existing.sections,
    version: changed ? existing.version + 1 : existing.version,
    updatedAt: new Date().toISOString()
  }
  templates[idx] = updated
  await writeTemplates(rootPath, templates)
  return updated
}

export async function setTemplateArchived(
  rootPath: string,
  templateId: string,
  archived: boolean
): Promise<Template> {
  const templates = await readTemplates(rootPath)
  const idx = templates.findIndex((t) => t.id === templateId)
  if (idx === -1) throw new Error('Template not found.')
  templates[idx] = { ...templates[idx], archived, updatedAt: new Date().toISOString() }
  await writeTemplates(rootPath, templates)
  return templates[idx]
}

export async function deleteTemplate(rootPath: string, templateId: string): Promise<DeleteTemplateResult> {
  const allPatients = await listAllPatients(rootPath)
  const inUseCount = allPatients.filter((p) => p.templateId === templateId).length
  if (inUseCount > 0) {
    return { ok: false, reason: 'in-use', patientCount: inUseCount }
  }
  const templates = await readTemplates(rootPath)
  const next = templates.filter((t) => t.id !== templateId)
  await writeTemplates(rootPath, next)
  return { ok: true }
}
