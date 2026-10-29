import { useEffect, useState } from 'react'
import { Building2, MoreVertical, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { useToast } from '@renderer/components/Toast'
import type { AppConfig, HospitalSummary } from '@shared/types'

interface Props {
  config: AppConfig
  onOpenHospital: (hospital: HospitalSummary) => void
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard({ config, onOpenHospital }: Props): React.JSX.Element {
  const [hospitals, setHospitals] = useState<HospitalSummary[] | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [renaming, setRenaming] = useState<HospitalSummary | null>(null)
  const [deleting, setDeleting] = useState<HospitalSummary | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const toast = useToast()

  function refresh(): void {
    window.api.listHospitals().then(setHospitals)
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="h-full overflow-y-auto bg-secondary/20 p-8">
      <h1 className="text-2xl font-semibold">
        {greeting()}, {config.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Your Hospitals</p>

      {hospitals === null ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : hospitals.length === 0 ? (
        <Card className="mt-6 max-w-md border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <div>
              <CardTitle className="text-base font-medium">No hospitals yet</CardTitle>
              <CardDescription className="mt-1">
                Add your first hospital or clinic to start organizing patients.
              </CardDescription>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Hospital
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {hospitals.map((h) => (
            <Card key={h.folderName} className="group relative flex flex-col justify-between p-5 hover:shadow-md">
              <button className="text-left" onClick={() => onOpenHospital(h)}>
                <CardTitle className="text-base font-medium">{h.name}</CardTitle>
                <CardDescription className="mt-1">
                  {h.patientCount} {h.patientCount === 1 ? 'patient' : 'patients'}
                </CardDescription>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                    aria-label="Hospital options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setRenaming(h)}>Rename</DropdownMenuItem>
                  <DropdownMenuItem
                    destructive
                    onSelect={() => {
                      setDeleteError(null)
                      setDeleting(h)
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Card>
          ))}
          <button
            onClick={() => setAddOpen(true)}
            className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">Add Hospital</span>
          </button>
        </div>
      )}

      <AddHospitalDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          setAddOpen(false)
          toast('Hospital added')
          refresh()
        }}
      />

      <RenameHospitalDialog
        hospital={renaming}
        onOpenChange={(open) => !open && setRenaming(null)}
        onRenamed={() => {
          setRenaming(null)
          toast('Hospital renamed')
          refresh()
        }}
      />

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>
              This removes the hospital folder from your records. This can&apos;t be undone from inside
              the app.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleting) return
                const result = await window.api.deleteHospital(deleting.folderName)
                if (result.ok) {
                  setDeleting(null)
                  toast('Hospital deleted')
                  refresh()
                } else {
                  setDeleteError(
                    `This hospital has ${result.patientCount} patient${result.patientCount === 1 ? '' : 's'}. Move or remove them first — deleting a hospital with patients isn't allowed to avoid losing records.`
                  )
                }
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

function AddHospitalDialog({
  open,
  onOpenChange,
  onCreated
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setError(null)
    }
  }, [open])

  async function submit(): Promise<void> {
    if (!name.trim()) return setError('Hospital name is required.')
    setSubmitting(true)
    setError(null)
    try {
      await window.api.createHospital(name)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create hospital.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a hospital or clinic</DialogTitle>
          <DialogDescription>Patients are organized separately per hospital.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="new-hospital">Hospital name</Label>
          <Input
            id="new-hospital"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="City Hospital"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RenameHospitalDialog({
  hospital,
  onOpenChange,
  onRenamed
}: {
  hospital: HospitalSummary | null
  onOpenChange: (open: boolean) => void
  onRenamed: () => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (hospital) {
      setName(hospital.name)
      setError(null)
    }
  }, [hospital])

  async function submit(): Promise<void> {
    if (!hospital) return
    if (!name.trim()) return setError('Hospital name is required.')
    setSubmitting(true)
    setError(null)
    try {
      await window.api.renameHospital(hospital.folderName, name)
      onRenamed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename hospital.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!hospital} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename hospital</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="rename-hospital">Hospital name</Label>
          <Input
            id="rename-hospital"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
