import { promises as fs } from 'fs'
import { join, sep } from 'path'
import AdmZip from 'adm-zip'
import { backupsDir } from './paths'

export async function createBackup(rootPath: string): Promise<string> {
  const dir = backupsDir(rootPath)
  await fs.mkdir(dir, { recursive: true })

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const outPath = join(dir, `ClinicBackup_${timestamp}.zip`)

  const zip = new AdmZip()
  zip.addLocalFolder(rootPath, '', (filename) => !filename.startsWith(`Backups${sep}`) && filename !== 'Backups')
  await zip.writeZipPromise(outPath)

  return outPath
}
