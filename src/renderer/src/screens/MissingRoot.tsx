import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import type { AppStatus } from '@shared/types'

interface Props {
  rootPath: string
  onRelinked: (status: AppStatus) => void
  onStartFresh: () => void
}

export default function MissingRoot({ rootPath, onRelinked, onStartFresh }: Props): React.JSX.Element {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function locate(): Promise<void> {
    const picked = await window.api.pickFolder()
    if (!picked) return
    setBusy(true)
    setError(null)
    try {
      const result = await window.api.relinkRoot(picked)
      if (result.ok && result.status) {
        onRelinked(result.status)
      } else {
        setError('That folder doesn’t contain a PhysioRecords app.config.json. Pick the right folder.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-secondary/40 p-6">
      <Card className="w-[460px]">
        <CardHeader>
          <CardTitle className="text-xl">We couldn&apos;t find your records folder</CardTitle>
          <CardDescription>
            The app last remembered your records at <code className="break-all">{rootPath}</code>, but
            that folder seems to have moved or been renamed. Your data is safe — locate it, or set up a
            new one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={locate} disabled={busy}>
            Locate my records folder
          </Button>
          <Button variant="outline" className="w-full" onClick={onStartFresh} disabled={busy}>
            Start fresh instead
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
