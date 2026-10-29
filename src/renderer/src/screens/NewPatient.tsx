import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardTitle, CardDescription } from '@renderer/components/ui/card'
import { Label } from '@renderer/components/ui/label'
import FieldInput from '@renderer/components/FieldInput'
import { useToast } from '@renderer/components/Toast'
import type { HospitalSummary, Template } from '@shared/types'

interface Props {
  hospital: HospitalSummary
  onCancel: () => void
  onCreated: (patientId: string) => void
}

export default function NewPatient({ hospital, onCancel, onCreated }: Props): React.JSX.Element {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [selected, setSelected] = useState<Template | null>(null)
  const [fields, setFields] = useState<Record<string, unknown>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  useEffect(() => {
    window.api.listTemplates().then((all) => {
      const active = all.filter((t) => !t.archived)
      setTemplates(active)
      if (active.length === 1) setSelected(active[0])
    })
  }, [])

  async function submit(): Promise<void> {
    if (!selected) return
    const missing = selected.sections
      .flatMap((s) => s.fields)
      .filter((f) => f.required)
      .find((f) => {
        const v = fields[f.id]
        return v === undefined || v === null || v === ''
      })
    if (missing) return setError(`${missing.label} is required.`)

    setSubmitting(true)
    setError(null)
    try {
      const patient = await window.api.createPatient(
        hospital.folderName,
        hospital.id,
        selected.id,
        selected.version,
        fields
      )
      toast('Patient created')
      onCreated(patient.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create patient.')
    } finally {
      setSubmitting(false)
    }
  }

  if (templates === null) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>
  }

  if (!selected) {
    return (
      <div className="h-full overflow-y-auto bg-secondary/20 p-8">
        <button onClick={onCancel} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {hospital.name}
        </button>
        <h1 className="text-lg font-semibold">Choose a template</h1>
        {templates.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No templates yet. Add one from Settings → Templates before creating a patient.
          </p>
        ) : (
          <div className="mt-4 grid max-w-lg gap-3">
            {templates.map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer p-4 hover:border-primary"
                onClick={() => setSelected(t)}
              >
                <CardTitle className="text-sm font-medium">{t.name}</CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  {t.sections.reduce((n, s) => n + s.fields.length, 0)} fields
                </CardDescription>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-secondary/20 p-8">
      <button
        onClick={() => (templates.length > 1 ? setSelected(null) : onCancel())}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {templates.length > 1 ? 'Choose a different template' : hospital.name}
      </button>

      <h1 className="text-lg font-semibold">New Patient</h1>
      <p className="text-sm text-muted-foreground">Using {selected.name}</p>

      <div className="mt-6 max-w-xl space-y-6">
        {selected.sections.map((section) => (
          <Card key={section.id} className="p-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.name}
            </CardTitle>
            <CardContent className="mt-3 space-y-4 p-0">
              {section.fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  {field.type !== 'checkbox' && (
                    <Label htmlFor={field.id}>
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </Label>
                  )}
                  <FieldInput
                    field={field}
                    value={fields[field.id]}
                    onChange={(v) => setFields((prev) => ({ ...prev, [field.id]: v }))}
                    hospitalFolderName={hospital.folderName}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Patient'}
          </Button>
        </div>
      </div>
    </div>
  )
}
