import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardDescription, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import TemplateManager from '@renderer/screens/settings/TemplateManager'
import { useToast } from '@renderer/components/Toast'
import type { AppConfig } from '@shared/types'

interface Props {
  config: AppConfig
  onBack: () => void
  onProfileUpdated: (config: AppConfig) => void
}

export default function Settings({ config, onBack, onProfileUpdated }: Props): React.JSX.Element {
  return (
    <div className="h-full overflow-y-auto bg-secondary/20 p-8">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="max-w-2xl space-y-10">
        <ProfileSection config={config} onProfileUpdated={onProfileUpdated} />
        <TemplateManager />
        <StorageSection config={config} />
        <AboutSection />
      </div>
    </div>
  )
}

function ProfileSection({
  config,
  onProfileUpdated
}: {
  config: AppConfig
  onProfileUpdated: (config: AppConfig) => void
}): React.JSX.Element {
  const [name, setName] = useState(config.name)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function saveName(): Promise<void> {
    const updated = await window.api.updateProfile({ name })
    onProfileUpdated(updated)
    setMessage('Saved.')
    setTimeout(() => setMessage(null), 2000)
  }

  async function changePassword(): Promise<void> {
    setError(null)
    if (newPw.length < 6) return setError('New password must be at least 6 characters.')
    if (newPw !== confirmPw) return setError('Passwords do not match.')
    setSaving(true)
    try {
      const ok = await window.api.changePassword(currentPw, newPw)
      if (ok) {
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
        setMessage('Password changed.')
        setTimeout(() => setMessage(null), 2000)
      } else {
        setError('Current password is incorrect.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Profile</h2>
      <Card className="mt-4 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="settings-name">Your name</Label>
            <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={saveName} disabled={!name.trim() || name === config.name}>
            Save
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-pw">Current password</Label>
            <Input id="current-pw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <Input id="new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Confirm</Label>
            <Input id="confirm-pw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        {message && <p className="mt-2 text-sm text-primary">{message}</p>}
        <Button
          variant="outline"
          className="mt-3"
          onClick={changePassword}
          disabled={saving || !currentPw || !newPw}
        >
          Change password
        </Button>
      </Card>
    </section>
  )
}

function StorageSection({ config }: { config: AppConfig }): React.JSX.Element {
  const [backupPath, setBackupPath] = useState<string | null>(null)
  const [backing, setBacking] = useState(false)
  const toast = useToast()

  return (
    <section>
      <h2 className="text-lg font-semibold">Storage &amp; Backup</h2>
      <Card className="mt-4 space-y-4 p-4">
        <div>
          <Label>Records folder</Label>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {config.rootPath}
            </div>
            <Button variant="outline" size="sm" onClick={() => window.api.openRootFolder()}>
              Open
            </Button>
          </div>
          <CardDescription className="mt-1.5">
            You can back up everything just by copying this folder — it contains all patient data and
            Excel files.
          </CardDescription>
        </div>
        <div>
          <Button
            variant="outline"
            disabled={backing}
            onClick={async () => {
              setBacking(true)
              try {
                const path = await window.api.createBackup()
                setBackupPath(path)
                toast('Backup created')
              } finally {
                setBacking(false)
              }
            }}
          >
            {backing ? 'Creating backup…' : 'Create backup now'}
          </Button>
          {backupPath && <p className="mt-2 text-sm text-muted-foreground">Saved to {backupPath}</p>}
        </div>
      </Card>
    </section>
  )
}

function AboutSection(): React.JSX.Element {
  return (
    <section>
      <h2 className="text-lg font-semibold">About</h2>
      <Card className="mt-4 p-4 text-sm text-muted-foreground">
        <CardTitle className="text-sm text-foreground">PhysioRecords</CardTitle>
        <p className="mt-1">Version 0.1.0 · Offline · Your data never leaves this computer.</p>
      </Card>
    </section>
  )
}
