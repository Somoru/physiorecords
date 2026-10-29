import { useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import FieldEditorDialog from '@renderer/screens/settings/FieldEditorDialog'
import { useToast } from '@renderer/components/Toast'
import type { Template, TemplateField, TemplateSection } from '@shared/types'

interface Props {
  template: Template | null
  onBack: () => void
  onSaved: () => void
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export default function TemplateEditor({ template, onBack, onSaved }: Props): React.JSX.Element {
  const [name, setName] = useState(template?.name ?? '')
  const [sections, setSections] = useState<TemplateSection[]>(template?.sections ?? [])
  const [fieldEditor, setFieldEditor] = useState<{ sectionIdx: number; field: TemplateField | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  function addSection(): void {
    setSections([...sections, { id: `sec_${Date.now()}`, name: 'New Section', fields: [] }])
  }

  function updateSectionName(idx: number, newName: string): void {
    setSections(sections.map((s, i) => (i === idx ? { ...s, name: newName } : s)))
  }

  function removeSection(idx: number): void {
    setSections(sections.filter((_, i) => i !== idx))
  }

  function moveSection(idx: number, dir: -1 | 1): void {
    const target = idx + dir
    if (target < 0 || target >= sections.length) return
    setSections(move(sections, idx, target))
  }

  function saveField(sectionIdx: number, field: TemplateField): void {
    setSections(
      sections.map((s, i) => {
        if (i !== sectionIdx) return s
        const exists = s.fields.some((f) => f.id === field.id)
        return {
          ...s,
          fields: exists ? s.fields.map((f) => (f.id === field.id ? field : f)) : [...s.fields, field]
        }
      })
    )
    setFieldEditor(null)
  }

  function removeField(sectionIdx: number, fieldId: string): void {
    setSections(
      sections.map((s, i) => (i === sectionIdx ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) } : s))
    )
  }

  function moveField(sectionIdx: number, fieldIdx: number, dir: -1 | 1): void {
    setSections(
      sections.map((s, i) => {
        if (i !== sectionIdx) return s
        const target = fieldIdx + dir
        if (target < 0 || target >= s.fields.length) return s
        return { ...s, fields: move(s.fields, fieldIdx, target) }
      })
    )
  }

  async function save(): Promise<void> {
    if (!name.trim()) return setError('Template name is required.')
    setSaving(true)
    setError(null)
    try {
      if (template) {
        await window.api.updateTemplate(template.id, { name, sections })
      } else {
        await window.api.createTemplate(name, sections)
      }
      toast('Template saved')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save template.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-secondary/20 p-8">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Templates
      </button>

      <div className="max-w-2xl space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="template-name">Template name</Label>
          <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {sections.map((section, sIdx) => (
          <Card key={section.id} className="p-4">
            <div className="flex items-center gap-2">
              <Input
                value={section.name}
                onChange={(e) => updateSectionName(sIdx, e.target.value)}
                className="font-medium"
              />
              <button onClick={() => moveSection(sIdx, -1)} disabled={sIdx === 0} className="p-1 disabled:opacity-30">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveSection(sIdx, 1)}
                disabled={sIdx === sections.length - 1}
                className="p-1 disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button onClick={() => removeSection(sIdx)} className="p-1 text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <CardContent className="mt-3 space-y-2 p-0">
              {section.fields.map((field, fIdx) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <button
                    className="flex-1 text-left"
                    onClick={() => setFieldEditor({ sectionIdx: sIdx, field })}
                  >
                    {field.label}{' '}
                    <span className="text-muted-foreground">
                      ({field.type}
                      {field.required ? ', required' : ''})
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveField(sIdx, fIdx, -1)} disabled={fIdx === 0} className="p-1 disabled:opacity-30">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveField(sIdx, fIdx, 1)}
                      disabled={fIdx === section.fields.length - 1}
                      className="p-1 disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeField(sIdx, field.id)} className="p-1 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFieldEditor({ sectionIdx: sIdx, field: null })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add field
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addSection}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Section
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save template'}
          </Button>
        </div>
      </div>

      {fieldEditor && (
        <FieldEditorDialog
          field={fieldEditor.field}
          open={!!fieldEditor}
          onOpenChange={(open) => !open && setFieldEditor(null)}
          onSave={(field) => saveField(fieldEditor.sectionIdx, field)}
        />
      )}
    </div>
  )
}
