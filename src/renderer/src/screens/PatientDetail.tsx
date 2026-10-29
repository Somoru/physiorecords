import { useEffect, useState } from 'react'
import { ArrowLeft, FileSpreadsheet, Paperclip, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Textarea } from '@renderer/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import FieldInput from '@renderer/components/FieldInput'
import { useToast } from '@renderer/components/Toast'
import type { Attachment, HospitalSummary, Patient, Template, TemplateField, Visit } from '@shared/types'

interface Props {
  hospital: HospitalSummary
  patientId: string
  onBack: () => void
  onDeleted: () => void
}

function findField(template: Template | undefined, matcher: RegExp): TemplateField | undefined {
  return template?.sections.flatMap((s) => s.fields).find((f) => matcher.test(f.id) || matcher.test(f.label))
}

export default function PatientDetail({ hospital, patientId, onBack, onDeleted }: Props): React.JSX.Element {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [template, setTemplate] = useState<Template | undefined>(undefined)
  const [visits, setVisits] = useState<Visit[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [editing, setEditing] = useState(false)
  const [editFields, setEditFields] = useState<Record<string, unknown>>({})
  const [addVisitOpen, setAddVisitOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [allTemplates, setAllTemplates] = useState<Template[]>([])
  const toast = useToast()

  function refresh(): void {
    window.api.getPatient(hospital.folderName, patientId).then(setPatient)
    window.api.listVisits(hospital.folderName, patientId).then(setVisits)
    window.api.listAttachments(hospital.folderName, patientId).then(setAttachments)
  }

  useEffect(() => {
    refresh()
    window.api.listTemplates().then(setAllTemplates)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospital.folderName, patientId])

  useEffect(() => {
    if (patient) setTemplate(allTemplates.find((t) => t.id === patient.templateId))
  }, [patient, allTemplates])

  if (!patient) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>
  }

  const nameField = findField(template, /name/i)
  const displayName = nameField && typeof patient.fields[nameField.id] === 'string' ? (patient.fields[nameField.id] as string) : patient.id
  const ageField = findField(template, /age/i)
  const phoneField = findField(template, /phone/i)

  async function saveEdits(): Promise<void> {
    setSaving(true)
    try {
      await window.api.updatePatient(hospital.folderName, patientId, editFields)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-secondary/20 p-8">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {hospital.name}
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{displayName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ageField && patient.fields[ageField.id] ? `${patient.fields[ageField.id]} yrs · ` : ''}
            {phoneField ? (patient.fields[phoneField.id] as string) ?? '' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {saved && <span className="self-center text-sm text-primary">Saved</span>}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.api.openPatientExcel(hospital.folderName, patientId)}
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Open Excel
          </Button>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditFields(patient.fields)
                setEditing(true)
              }}
            >
              Edit
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-6 max-w-2xl space-y-4">
        {(template?.sections ?? []).map((section) => (
          <Card key={section.id} className="p-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.name}
            </CardTitle>
            <CardContent className="mt-3 space-y-3 p-0">
              {section.fields.map((field) =>
                editing ? (
                  <div key={field.id} className="space-y-1.5">
                    {field.type !== 'checkbox' && <Label>{field.label}</Label>}
                    <FieldInput
                      field={field}
                      value={editFields[field.id]}
                      onChange={(v) => setEditFields((prev) => ({ ...prev, [field.id]: v }))}
                      hospitalFolderName={hospital.folderName}
                    />
                  </div>
                ) : (
                  <div key={field.id} className="flex justify-between border-b py-1.5 text-sm last:border-0">
                    <span className="text-muted-foreground">{field.label}</span>
                    <span className="font-medium">{String(patient.fields[field.id] ?? '—')}</span>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        ))}

        {editing && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveEdits} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-10 max-w-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Visits</h2>
          <Button size="sm" onClick={() => setAddVisitOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Visit
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {visits.length === 0 && <p className="text-sm text-muted-foreground">No visits recorded yet.</p>}
          {[...visits].reverse().map((v) => (
            <Card key={v.id} className="p-4">
              <div className="text-sm font-medium">{v.date}</div>
              {v.notes && <p className="mt-1 text-sm text-muted-foreground">{v.notes}</p>}
              {Object.keys(v.fields).length > 0 && (
                <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  {Object.entries(v.fields).map(([k, val]) => (
                    <div key={k}>
                      <span className="font-medium text-foreground">{k}:</span> {String(val)}
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-10 max-w-2xl pb-10">
        <h2 className="text-base font-semibold">Attachments</h2>
        <AttachmentsSection
          hospital={hospital}
          patientId={patientId}
          attachments={attachments}
          onChanged={() => {
            toast('Attachments updated')
            window.api.listAttachments(hospital.folderName, patientId).then(setAttachments)
          }}
        />
      </div>

      <AddVisitDialog
        open={addVisitOpen}
        onOpenChange={setAddVisitOpen}
        onSaved={() => {
          setAddVisitOpen(false)
          toast('Visit saved')
          refresh()
        }}
        hospitalFolderName={hospital.folderName}
        patientId={patientId}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {displayName}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes this patient&apos;s records, visits, and attachments from disk.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await window.api.deletePatient(hospital.folderName, patientId)
                onDeleted()
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddVisitDialog({
  open,
  onOpenChange,
  onSaved,
  hospitalFolderName,
  patientId
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  hospitalFolderName: string
  patientId: string
}): React.JSX.Element {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [extra, setExtra] = useState<{ key: string; value: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().slice(0, 10))
      setNotes('')
      setExtra([])
    }
  }, [open])

  async function submit(): Promise<void> {
    setSaving(true)
    try {
      const fields: Record<string, unknown> = {}
      for (const { key, value } of extra) {
        if (key.trim()) fields[key.trim()] = value
      }
      await window.api.createVisit(hospitalFolderName, patientId, { date, notes, fields })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add visit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="visit-date">Date</Label>
            <Input id="visit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visit-notes">Notes</Label>
            <Textarea id="visit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Other details (optional)</Label>
            {extra.map((row, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Field, e.g. Pain Scale"
                  value={row.key}
                  onChange={(e) =>
                    setExtra(extra.map((r, idx) => (idx === i ? { ...r, key: e.target.value } : r)))
                  }
                />
                <Input
                  placeholder="Value"
                  value={row.value}
                  onChange={(e) =>
                    setExtra(extra.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r)))
                  }
                />
                <button onClick={() => setExtra(extra.filter((_, idx) => idx !== i))} className="p-2 text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setExtra([...extra, { key: '', value: '' }])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add detail
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !date}>
            {saving ? 'Saving…' : 'Save visit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AttachmentsSection({
  hospital,
  patientId,
  attachments,
  onChanged
}: {
  hospital: HospitalSummary
  patientId: string
  attachments: Attachment[]
  onChanged: () => void
}): React.JSX.Element {
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)

  async function addFromPath(path: string): Promise<void> {
    setBusy(true)
    try {
      await window.api.addAttachment(hospital.folderName, patientId, path, '')
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async (e) => {
          e.preventDefault()
          setDragOver(false)
          const files = Array.from(e.dataTransfer.files)
          for (const file of files) {
            const path = window.api.getPathForFile(file)
            await addFromPath(path)
          }
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors ${dragOver ? 'border-primary bg-accent/50' : ''}`}
      >
        <Paperclip className="h-5 w-5" />
        <p>Drag files here, or</p>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={async () => {
            const path = await window.api.pickFile()
            if (path) await addFromPath(path)
          }}
        >
          Choose file
        </Button>
      </div>

      {attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
              <button
                className="flex-1 truncate text-left hover:underline"
                onClick={() => window.api.openAttachment(hospital.folderName, patientId, a.filename)}
              >
                {a.filename}
              </button>
              <span className="mr-2 text-xs text-muted-foreground">{a.addedAt.slice(0, 10)}</span>
              <button
                onClick={async () => {
                  await window.api.removeAttachment(hospital.folderName, patientId, a.id)
                  onChanged()
                }}
                className="p-1 text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
