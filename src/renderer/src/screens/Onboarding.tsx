import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import type { AppConfig } from '@shared/types'

interface Props {
  onComplete: (config: AppConfig) => void
}

type Step = 'welcome' | 'storage' | 'hospital'

export default function Onboarding({ onComplete }: Props): React.JSX.Element {
  const [step, setStep] = useState<Step>('welcome')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')

  const [rootPath, setRootPath] = useState('')

  const [hospitalName, setHospitalName] = useState('')

  function validateWelcome(): string | null {
    if (!name.trim()) return 'Please enter your name.'
    if (password.length < 6) return 'Password must be at least 6 characters.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    if (!securityQuestion.trim()) return 'Please add a security question.'
    if (!securityAnswer.trim()) return 'Please add an answer to your security question.'
    return null
  }

  async function handlePickFolder(): Promise<void> {
    const picked = await window.api.pickFolder()
    if (picked) setRootPath(picked)
  }

  async function finish(skipHospital: boolean): Promise<void> {
    setSubmitting(true)
    setError(null)
    try {
      const config = await window.api.completeOnboarding({
        name: name.trim(),
        password,
        securityQuestion: securityQuestion.trim(),
        securityAnswer,
        rootPath,
        hospitalName: skipHospital ? undefined : hospitalName
      })
      onComplete(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while setting up.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-secondary/40 p-6">
      <Card className="w-[480px]">
        {step === 'welcome' && (
          <>
            <CardHeader>
              <CardTitle className="text-xl">Welcome! Let&apos;s set up your clinic records.</CardTitle>
              <CardDescription>This only takes a minute — everything stays on this computer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Ramesh" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Choose a password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="question">Security question</Label>
                <Input
                  id="question"
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  placeholder="Your first pet's name?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="answer">Answer</Label>
                <Input id="answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Since this app works offline, there&apos;s no email reset. This answer is your only
                  way back in if you forget your password.
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                onClick={() => {
                  const v = validateWelcome()
                  if (v) return setError(v)
                  setError(null)
                  setStep('storage')
                }}
              >
                Continue
              </Button>
            </CardContent>
          </>
        )}

        {step === 'storage' && (
          <>
            <CardHeader>
              <CardTitle className="text-xl">Where should your clinic records be saved?</CardTitle>
              <CardDescription>
                Everything — including Excel files for each patient — will live in this folder. You can
                back it up any time just by copying it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                {rootPath || <span className="text-muted-foreground">No folder chosen yet</span>}
              </div>
              <Button variant="outline" className="w-full" onClick={handlePickFolder}>
                Choose folder
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('welcome')}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!rootPath}
                  onClick={() => {
                    setError(null)
                    setStep('hospital')
                  }}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === 'hospital' && (
          <>
            <CardHeader>
              <CardTitle className="text-xl">Add your first hospital or clinic</CardTitle>
              <CardDescription>You can add more, and organize patients separately by hospital.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="hospital">Hospital name</Label>
                <Input
                  id="hospital"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="City Hospital"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('storage')} disabled={submitting}>
                  Back
                </Button>
                <Button variant="outline" onClick={() => finish(true)} disabled={submitting}>
                  Skip
                </Button>
                <Button className="flex-1" onClick={() => finish(false)} disabled={submitting || !hospitalName.trim()}>
                  {submitting ? 'Setting up…' : 'Create'}
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
