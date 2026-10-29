import { useEffect, useState } from 'react'
import { Star, Paperclip } from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import type { TemplateField } from '@shared/types'

interface Props {
  field: TemplateField
  value: unknown
  onChange: (value: unknown) => void
  hospitalFolderName?: string
}

export default function FieldInput({ field, value, onChange, hospitalFolderName }: Props): React.JSX.Element {
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (field.type === 'autocomplete' && hospitalFolderName) {
      window.api.getFieldSuggestions(hospitalFolderName, field.id).then(setSuggestions)
    }
  }, [field.type, field.id, hospitalFolderName])

  switch (field.type) {
    case 'paragraph':
      return (
        <Textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
        />
      )

    case 'number':
      return (
        <Input
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )

    case 'phone':
      return <Input type="tel" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />

    case 'email':
      return <Input type="email" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />

    case 'date':
      return <Input type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />

    case 'dropdown':
      return (
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>
            Select…
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.label}
        </label>
      )

    case 'rating': {
      const current = Number(value) || 0
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => onChange(n)}>
              <Star
                className={cn(
                  'h-5 w-5',
                  n <= current ? 'fill-primary text-primary' : 'text-muted-foreground'
                )}
              />
            </button>
          ))}
        </div>
      )
    }

    case 'image':
    case 'file':
      return (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              const path = await window.api.pickFile()
              if (path) onChange(path.split(/[\\/]/).pop())
            }}
          >
            <Paperclip className="mr-1.5 h-3.5 w-3.5" />
            Choose file
          </Button>
          {value ? <span className="text-sm text-muted-foreground">{String(value)}</span> : null}
        </div>
      )

    case 'autocomplete':
      return (
        <>
          <Input
            list={`suggestions-${field.id}`}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
          <datalist id={`suggestions-${field.id}`}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </>
      )

    case 'text':
    default:
      return <Input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
  }
}
