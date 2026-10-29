import { useEffect, useState } from 'react'
import type { AppConfig, HospitalSummary } from '@shared/types'
import TopBar from '@renderer/components/TopBar'
import Dashboard from '@renderer/screens/Dashboard'
import PatientList from '@renderer/screens/PatientList'
import NewPatient from '@renderer/screens/NewPatient'
import PatientDetail from '@renderer/screens/PatientDetail'
import Settings from '@renderer/screens/Settings'

interface Props {
  config: AppConfig
  onLock: () => void
}

type View =
  | { name: 'dashboard' }
  | { name: 'hospital'; hospital: HospitalSummary }
  | { name: 'newPatient'; hospital: HospitalSummary }
  | { name: 'patient'; hospital: HospitalSummary; patientId: string }
  | { name: 'settings' }

export default function Home({ config, onLock }: Props): React.JSX.Element {
  const [view, setView] = useState<View>({ name: 'dashboard' })
  const [currentConfig, setCurrentConfig] = useState(config)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return

      if (e.key === 'f' && view.name === 'hospital') {
        e.preventDefault()
        document.getElementById('patient-search')?.focus()
      } else if (e.key === 'n' && view.name === 'hospital') {
        e.preventDefault()
        setView({ name: 'newPatient', hospital: view.hospital })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view])

  return (
    <div className="flex h-full flex-col">
      <TopBar onSettings={() => setView({ name: 'settings' })} onLock={onLock} />
      <div className="flex-1 overflow-hidden">
        {view.name === 'dashboard' && (
          <Dashboard config={currentConfig} onOpenHospital={(hospital) => setView({ name: 'hospital', hospital })} />
        )}

        {view.name === 'hospital' && (
          <PatientList
            hospital={view.hospital}
            onBack={() => setView({ name: 'dashboard' })}
            onNewPatient={() => setView({ name: 'newPatient', hospital: view.hospital })}
            onOpenPatient={(patientId) => setView({ name: 'patient', hospital: view.hospital, patientId })}
          />
        )}

        {view.name === 'newPatient' && (
          <NewPatient
            hospital={view.hospital}
            onCancel={() => setView({ name: 'hospital', hospital: view.hospital })}
            onCreated={(patientId) => setView({ name: 'patient', hospital: view.hospital, patientId })}
          />
        )}

        {view.name === 'patient' && (
          <PatientDetail
            hospital={view.hospital}
            patientId={view.patientId}
            onBack={() => setView({ name: 'hospital', hospital: view.hospital })}
            onDeleted={() => setView({ name: 'hospital', hospital: view.hospital })}
          />
        )}

        {view.name === 'settings' && (
          <Settings
            config={currentConfig}
            onBack={() => setView({ name: 'dashboard' })}
            onProfileUpdated={setCurrentConfig}
          />
        )}
      </div>
    </div>
  )
}
