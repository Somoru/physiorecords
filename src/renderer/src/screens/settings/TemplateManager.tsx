import { useEffect, useState } from 'react'
import { ArchiveRestore, Archive, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardDescription, CardTitle } from '@renderer/components/ui/card'
import TemplateEditor from '@renderer/screens/settings/TemplateEditor'
import type { Template } from '@shared/types'

export default function TemplateManager(): React.JSX.Element {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [editing, setEditing] = useState<Template | null | 'new'>(null)
  const [error, setError] = useState<string | null>(null)

  function refresh(): void {
    window.api.listTemplates().then(setTemplates)
  }

  useEffect(() => {
    refresh()
  }, [])

  if (editing) {
    return (
      <TemplateEditor
        template={editing === 'new' ? null : editing}
        onBack={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          refresh()
        }}
      />
    )
  }

  const active = templates?.filter((t) => !t.archived) ?? []
  const archived = templates?.filter((t) => t.archived) ?? []

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Templates</h2>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="mr-1.5 h-4 w-4" /> New Template
        </Button>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-4 space-y-2">
        {active.map((t) => (
          <Card key={t.id} className="flex items-center justify-between p-4">
            <div>
              <CardTitle className="text-sm font-medium">{t.name}</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                v{t.version} · {t.sections.reduce((n, s) => n + s.fields.length, 0)} fields
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditing(t)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Duplicate"
                onClick={async () => {
                  await window.api.createTemplate(`${t.name} (Copy)`, t.sections)
                  refresh()
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Archive"
                onClick={async () => {
                  await window.api.setTemplateArchived(t.id, true)
                  refresh()
                }}
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Delete"
                onClick={async () => {
                  setError(null)
                  const result = await window.api.deleteTemplate(t.id)
                  if (result.ok) refresh()
                  else
                    setError(
                      `${t.name} is used by ${result.patientCount} patient${result.patientCount === 1 ? '' : 's'}. Archive it instead of deleting.`
                    )
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}

        {active.length === 0 && (
          <p className="text-sm text-muted-foreground">No templates yet. Create one to start adding patients.</p>
        )}
      </div>

      {archived.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-muted-foreground">Archived</h3>
          <div className="mt-2 space-y-2">
            {archived.map((t) => (
              <Card key={t.id} className="flex items-center justify-between p-4 opacity-70">
                <CardTitle className="text-sm font-medium">{t.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Restore"
                  onClick={async () => {
                    await window.api.setTemplateArchived(t.id, false)
                    refresh()
                  }}
                >
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
