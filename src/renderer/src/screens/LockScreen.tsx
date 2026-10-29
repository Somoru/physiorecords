import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'

interface Props {
  name: string
  onUnlocked: () => void
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function LockScreen({ name, onUnlocked }: Props): React.JSX.Element {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)

  async function handleUnlock(): Promise<void> {
    setSubmitting(true)
    setError(null)
    try {
      const ok = await window.api.unlock(password)
      if (ok) {
        onUnlocked()
      } else {
        setError('Incorrect password.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (showRecovery) {
    return <RecoveryFlow onBack={() => setShowRecovery(false)} onUnlocked={onUnlocked} />
  }

  return (
    <div className="flex h-full items-center justify-center bg-secondary/40 p-6">
      <Card className="w-[380px]">
        <CardHeader>
          <CardTitle className="text-xl">
            {greeting()}, {name}
          </CardTitle>
          <CardDescription>Enter your password to unlock your clinic records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lock-password">Password</Label>
            <Input
              id="lock-password"
              type="password"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleUnlock} disabled={submitting || !password}>
            {submitting ? 'Unlocking…' : 'Unlock'}
          </Button>
          <button
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
            onClick={() => setShowRecovery(true)}
          >
            Forgot password?
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

function RecoveryFlow({
  onBack,
  onUnlocked
}: {
  onBack: () => void
  onUnlocked: () => void
}): React.JSX.Element {
  const [question, setQuestion] = useState<string | null | 'loading'>('loading')
  const [answer, setAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    window.api.getSecurityQuestion().then(setQuestion)
  }, [])

  if (question === 'loading') {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>
  }

  if (!question) {
    return (
      <div className="flex h-full items-center justify-center bg-secondary/40 p-6">
        <Card className="w-[420px]">
          <CardHeader>
            <CardTitle>No recovery question found</CardTitle>
            <CardDescription>
              Your data is never lost — it&apos;s plain JSON and Excel files on disk. Only app access
              needs resetting. Ask a technical friend to delete <code>app.config.json</code> from your
              records folder, then relaunch the app to set up access again. Your patients and hospitals
              will be untouched.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={onBack}>
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  async function handleReset(): Promise<void> {
    setError(null)
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.')
    if (newPassword !== confirmPassword) return setError('Passwords do not match.')
    setSubmitting(true)
    try {
      const ok = await window.api.resetPasswordWithSecurityAnswer(answer, newPassword)
      if (ok) {
        onUnlocked()
      } else {
        setError('That answer doesn’t match.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-secondary/40 p-6">
      <Card className="w-[420px]">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>{question}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="answer">Your answer</Label>
            <Input id="answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="newpw">New password</Label>
              <Input
                id="newpw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmpw">Confirm</Label>
              <Input
                id="confirmpw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onBack} disabled={submitting}>
              Back
            </Button>
            <Button className="flex-1" onClick={handleReset} disabled={submitting}>
              {submitting ? 'Resetting…' : 'Reset password'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
