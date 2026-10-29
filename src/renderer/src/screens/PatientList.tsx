import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Search } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import type { HospitalSummary, Patient, Template } from '@shared/types'

interface Props {
  hospital: HospitalSummary
  onBack: () => void
  onNewPatient: () => void
  onOpenPatient: (patientId: string) => void
}

function primaryLabel(patient: Patient, template: Template | undefined): string {
  const nameField = template?.sections.flatMap((s) => s.fields).find((f) => f.id === 'name' || /name/i.test(f.label))
  if (nameField) {
    const v = patient.fields[nameField.id]
    if (typeof v === 'string' && v.trim()) return v
  }
  return patient.id
}

function secondaryLabel(patient: Patient, template: Template | undefined): string {
  const diagField = template?.sections.flatMap((s) => s.fields).find((f) => /diagnos/i.test(f.label))
  if (diagField) {
    const v = patient.fields[diagField.id]
    if (typeof v === 'string' && v.trim()) return v
  }
  return ''
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} ${months === 1 ? 'month' : 'months'} ago`
}

export default function PatientList({ hospital, onBack, onNewPatient, onOpenPatient }: Props): React.JSX.Element {
  const [patients, setPatients] = useState<Patient[] | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    window.api.listPatients(hospital.folderName).then(setPatients)
    window.api.listTemplates().then(setTemplates)
  }, [hospital.folderName])

  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates])

  const filtered = useMemo(() => {
    if (!patients) return []
    const q = query.trim().toLowerCase()
    if (!q) return patients
    return patients.filter((p) => {
      if (p.id.toLowerCase().includes(q)) return true
      return Object.values(p.fields).some((v) => typeof v === 'string' && v.toLowerCase().includes(q))
    })
  }, [patients, query])

  return (
    <div className="flex h-full flex-col bg-secondary/20">
      <div className="border-b bg-background px-8 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {hospital.name}
        </button>
        <div className="mt-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patients…"
              className="pl-8"
              id="patient-search"
            />
          </div>
          <Button onClick={onNewPatient}>
            <Plus className="mr-1.5 h-4 w-4" /> New Patient
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-4">
        {patients === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {patients.length === 0 ? 'No patients yet — add your first one.' : 'No patients match your search.'}
          </p>
        ) : (
          <div className="divide-y rounded-lg border bg-background">
            {filtered.map((p) => {
              const template = templateById.get(p.templateId)
              return (
                <button
                  key={p.id}
                  onClick={() => onOpenPatient(p.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent"
                >
                  <div>
                    <div className="text-sm font-medium">{primaryLabel(p, template)}</div>
                    <div className="text-xs text-muted-foreground">{secondaryLabel(p, template)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Last updated: {timeAgo(p.updatedAt)}</div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
