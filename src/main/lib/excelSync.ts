import ExcelJS from 'exceljs'
import type { Attachment, Patient, Template, Visit } from '../../shared/types'
import { readJson } from './atomicWrite'
import { patientJsonPath, patientXlsxPath, templatesPath } from './paths'
import { listVisits } from './visits'
import { listAttachments } from './attachments'
import { atomicWriteBuffer } from './atomicWrite'

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFEFF6F7' }
}

const SECTION_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF5F5F5' }
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
}

function autoWidth(ws: ExcelJS.Worksheet, minWidths: number[]): void {
  ws.columns.forEach((col, i) => {
    let max = minWidths[i] ?? 10
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length
      if (len > max) max = len
    })
    col.width = Math.min(max + 2, 60)
  })
}

function formatValue(v: unknown): string | number {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number') return v
  return String(v)
}

function buildDetailsSheet(wb: ExcelJS.Workbook, patient: Patient, template: Template | null): void {
  const ws = wb.addWorksheet('Details')
  ws.columns = [{ key: 'label', width: 28 }, { key: 'value', width: 50 }]

  const sections = template?.sections ?? [
    { id: 'fields', name: 'Fields', fields: Object.keys(patient.fields).map((k) => ({ id: k, label: k, type: 'text' as const, required: false })) }
  ]

  for (const section of sections) {
    const headerRow = ws.addRow([section.name, ''])
    headerRow.font = { bold: true, size: 12 }
    headerRow.fill = SECTION_FILL
    ws.mergeCells(headerRow.number, 1, headerRow.number, 2)

    for (const field of section.fields) {
      const row = ws.addRow([field.label, formatValue(patient.fields[field.id])])
      row.getCell(1).font = { color: { argb: 'FF64748B' } }
      row.eachCell((cell) => (cell.border = THIN_BORDER))
    }
    ws.addRow([])
  }

  const meta = ws.addRow(['Patient ID', patient.id])
  meta.getCell(1).font = { italic: true, color: { argb: 'FF94A3B8' } }
  meta.getCell(2).font = { italic: true, color: { argb: 'FF94A3B8' } }
}

function buildVisitsSheet(wb: ExcelJS.Workbook, visits: Visit[]): void {
  const ws = wb.addWorksheet('Visits')

  const extraKeys: string[] = []
  for (const v of visits) {
    for (const k of Object.keys(v.fields)) {
      if (!extraKeys.includes(k)) extraKeys.push(k)
    }
  }

  const headers = ['Date', 'Notes', ...extraKeys]
  ws.columns = headers.map((_h, i) => ({ key: `c${i}`, width: i < 2 ? 22 : 16 }))
  const headerRow = ws.addRow(headers)
  headerRow.font = { bold: true }
  headerRow.fill = HEADER_FILL
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  for (const v of visits) {
    ws.addRow([v.date, v.notes, ...extraKeys.map((k) => formatValue(v.fields[k]))])
  }

  autoWidth(ws, headers.map((h) => h.length))
}

function buildAttachmentsSheet(wb: ExcelJS.Workbook, attachments: Attachment[]): void {
  const ws = wb.addWorksheet('Attachments')
  const headers = ['Filename', 'Date Added', 'Notes']
  ws.columns = headers.map((_h, i) => ({ key: `c${i}`, width: i === 0 ? 32 : 22 }))
  const headerRow = ws.addRow(headers)
  headerRow.font = { bold: true }
  headerRow.fill = HEADER_FILL
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  for (const a of attachments) {
    ws.addRow([a.filename, a.addedAt.slice(0, 10), a.notes])
  }

  autoWidth(ws, headers.map((h) => h.length))
}

export async function syncPatientExcel(
  rootPath: string,
  hospitalFolderName: string,
  patientId: string
): Promise<void> {
  const patient = await readJson<Patient>(patientJsonPath(rootPath, hospitalFolderName, patientId))
  if (!patient) return

  const templatesFile = await readJson<{ templates: Template[] }>(templatesPath(rootPath))
  const template = templatesFile?.templates.find((t) => t.id === patient.templateId) ?? null

  const visits = await listVisits(rootPath, hospitalFolderName, patientId)
  const attachments = await listAttachments(rootPath, hospitalFolderName, patientId)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'PhysioRecords'
  wb.created = new Date()

  buildDetailsSheet(wb, patient, template)
  buildVisitsSheet(wb, visits)
  buildAttachmentsSheet(wb, attachments)

  const buffer = await wb.xlsx.writeBuffer()
  await atomicWriteBuffer(patientXlsxPath(rootPath, hospitalFolderName, patientId), Buffer.from(buffer))
}
