import { Settings, LogOut } from 'lucide-react'

interface Props {
  onSettings: () => void
  onLock: () => void
}

export default function TopBar({ onSettings, onLock }: Props): React.JSX.Element {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-4">
      <span className="text-sm font-semibold tracking-tight">PhysioRecords</span>
      <div className="flex items-center gap-1">
        <button
          onClick={onSettings}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          onClick={onLock}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Lock"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
