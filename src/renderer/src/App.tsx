import { useEffect, useState } from 'react'
import type { AppConfig, AppStatus } from '@shared/types'
import Onboarding from '@renderer/screens/Onboarding'
import LockScreen from '@renderer/screens/LockScreen'
import MissingRoot from '@renderer/screens/MissingRoot'
import Home from '@renderer/screens/Home'

type ViewState =
  | { view: 'loading' }
  | { view: 'onboarding' }
  | { view: 'locked'; name: string }
  | { view: 'missing-root'; rootPath: string }
  | { view: 'unlocked'; config: AppConfig }

function statusToView(status: AppStatus): ViewState {
  if (status.state === 'needs-onboarding') return { view: 'onboarding' }
  if (status.state === 'missing-root') return { view: 'missing-root', rootPath: status.rootPath }
  return { view: 'locked', name: status.name }
}

function App(): React.JSX.Element {
  const [state, setState] = useState<ViewState>({ view: 'loading' })

  useEffect(() => {
    window.api.getStatus().then((status) => setState(statusToView(status)))
  }, [])

  async function handleUnlocked(): Promise<void> {
    const config = await window.api.getConfig()
    if (config) setState({ view: 'unlocked', config })
  }

  if (state.view === 'loading') {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
  }

  if (state.view === 'onboarding') {
    return <Onboarding onComplete={(config) => setState({ view: 'unlocked', config })} />
  }

  if (state.view === 'missing-root') {
    return (
      <MissingRoot
        rootPath={state.rootPath}
        onRelinked={(status) => setState(statusToView(status))}
        onStartFresh={async () => {
          await window.api.forgetRoot()
          setState({ view: 'onboarding' })
        }}
      />
    )
  }

  if (state.view === 'locked') {
    return <LockScreen name={state.name} onUnlocked={handleUnlocked} />
  }

  return <Home config={state.config} onLock={() => setState({ view: 'locked', name: state.config.name })} />
}

export default App
