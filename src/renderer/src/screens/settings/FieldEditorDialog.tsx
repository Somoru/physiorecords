import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Switch } from '@renderer/components/ui/switch'
import type { FieldType, TemplateField } from '@shared/types'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'number', label: 'Number' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'autocomplete', label: 'Autocomplete' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'image', label: 'Image' },
  { value: 'file', label: 'File' }
]

interface Props {
  field: TemplateField | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (field: TemplateField) => void
}

export default function FieldEditorDialog({ field, open, onOpenChange, onSave }: Props): React.JSX.Element {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<FieldType>('text')
  const [required, setRequired] = useState(false)
  const [optionsText, setOptionsText] = useState('')

  useEffect(() => {
    if (open) {
      setLabel(field?.label ?? '')
      setType(field?.type ?? 'text')
      setRequired(field?.required ?? false)
      setOptionsText((field?.options ?? []).join(', '))
    }
  }, [open, field])

  function submit(): void {
    if (!label.trim()) return
    const id = field?.id ?? label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    onSave({
      id: id || `field_${Date.now()}`,
      label: label.trim(),
      type,
      required,
      options: type === 'dropdown' ? optionsText.split(',').map((s) => s.trim()).filter(Boolean) : undefined
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{field ? 'Edit field' : 'Add field'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="field-label">Label</Label>
            <Input id="field-label" value={label} autoFocus onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="field-type">Type</Label>
            <select
              id="field-type"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={type}
              onChange={(e) => setType(e.target.value as FieldType)}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {type === 'dropdown' && (
            <div className="space-y-1.5">
              <Label htmlFor="field-options">Options (comma separated)</Label>
              <Input
                id="field-options"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Mild, Moderate, Severe"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label htmlFor="field-required">Required</Label>
            <Switch id="field-required" checked={required} onCheckedChange={setRequired} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!label.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
