import { join } from 'path'

export function configPath(rootPath: string): string {
  return join(rootPath, 'app.config.json')
}

export function templatesPath(rootPath: string): string {
  return join(rootPath, 'templates.json')
}

export function hospitalsDir(rootPath: string): string {
  return join(rootPath, 'Hospitals')
}

export function hospitalDir(rootPath: string, hospitalFolderName: string): string {
  return join(hospitalsDir(rootPath), hospitalFolderName)
}

export function hospitalJsonPath(rootPath: string, hospitalFolderName: string): string {
  return join(hospitalDir(rootPath, hospitalFolderName), 'hospital.json')
}

export function patientsDir(rootPath: string, hospitalFolderName: string): string {
  return join(hospitalDir(rootPath, hospitalFolderName), 'Patients')
}

export function patientDir(rootPath: string, hospitalFolderName: string, patientId: string): string {
  return join(patientsDir(rootPath, hospitalFolderName), patientId)
}

export function backupsDir(rootPath: string): string {
  return join(rootPath, 'Backups')
}

export function patientJsonPath(rootPath: string, hospitalFolderName: string, patientId: string): string {
  return join(patientDir(rootPath, hospitalFolderName, patientId), 'patient.json')
}

export function patientXlsxPath(rootPath: string, hospitalFolderName: string, patientId: string): string {
  return join(patientDir(rootPath, hospitalFolderName, patientId), 'patient.xlsx')
}

export function visitsDir(rootPath: string, hospitalFolderName: string, patientId: string): string {
  return join(patientDir(rootPath, hospitalFolderName, patientId), 'visits')
}

export function visitJsonPath(
  rootPath: string,
  hospitalFolderName: string,
  patientId: string,
  visitId: string
): string {
  return join(visitsDir(rootPath, hospitalFolderName, patientId), `${visitId}.json`)
}

export function attachmentsDir(rootPath: string, hospitalFolderName: string, patientId: string): string {
  return join(patientDir(rootPath, hospitalFolderName, patientId), 'attachments')
}

export function attachmentsManifestPath(
  rootPath: string,
  hospitalFolderName: string,
  patientId: string
): string {
  return join(attachmentsDir(rootPath, hospitalFolderName, patientId), 'manifest.json')
}

/** Windows-safe folder name from an arbitrary hospital/entity name. */
export function toFolderName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '').trim() || 'Untitled'
}
