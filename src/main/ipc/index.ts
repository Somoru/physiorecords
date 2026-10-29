import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import type { OnboardingPayload, TemplateSection } from '../../shared/types'
import {
  getAppStatus,
  completeOnboarding,
  unlock,
  getSecurityQuestion,
  verifySecurityAnswerAndReset,
  changePassword,
  updateProfile,
  getCachedConfig
} from '../lib/config'
import { setRememberedRootPath, getRememberedRootPath } from '../lib/appState'
import { pathExists } from '../lib/atomicWrite'
import { configPath, patientXlsxPath } from '../lib/paths'
import { listHospitals, createHospital, renameHospital, deleteHospital } from '../lib/hospitals'
import { listTemplates, createTemplate, updateTemplate, setTemplateArchived, deleteTemplate } from '../lib/templates'
import {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  getFieldSuggestions,
  rebuildAllExcel
} from '../lib/patients'
import { listVisits, createVisit } from '../lib/visits'
import { listAttachments, addAttachment, removeAttachment } from '../lib/attachments'
import { syncPatientExcel } from '../lib/excelSync'
import { createBackup } from '../lib/backup'

export function registerIpcHandlers(): void {
  ipcMain.handle('app:getStatus', () => getAppStatus())

  ipcMain.handle('app:pickFolder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose a folder to store your clinic records'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('app:pickFile', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      properties: ['openFile'],
      title: 'Choose a file to attach'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('app:completeOnboarding', async (_e, payload: OnboardingPayload) => {
    await completeOnboarding(payload)
    // Onboarding just set the password in this same session — the user should land
    // straight on the dashboard, not be asked to re-type the password immediately.
    const { config } = getCachedConfig()
    return config
  })

  ipcMain.handle('app:unlock', async (_e, password: string) => unlock(password))

  ipcMain.handle('app:getSecurityQuestion', async () => getSecurityQuestion())

  ipcMain.handle(
    'app:resetPasswordWithSecurityAnswer',
    async (_e, answer: string, newPassword: string) => verifySecurityAnswerAndReset(answer, newPassword)
  )

  ipcMain.handle('app:changePassword', async (_e, current: string, next: string) =>
    changePassword(current, next)
  )

  ipcMain.handle('app:updateProfile', async (_e, updates: { name?: string; theme?: 'light' | 'dark' }) =>
    updateProfile(updates)
  )

  ipcMain.handle('app:getConfig', () => {
    try {
      const { config } = getCachedConfig()
      return config
    } catch {
      return null
    }
  })

  ipcMain.handle('app:relinkRoot', async (_e, rootPath: string) => {
    const exists = await pathExists(configPath(rootPath))
    if (!exists) return { ok: false as const }
    await setRememberedRootPath(rootPath)
    return { ok: true as const, status: await getAppStatus() }
  })

  ipcMain.handle('app:forgetRoot', async () => {
    await setRememberedRootPath('')
    return true
  })

  ipcMain.handle('app:getRememberedRootPath', async () => getRememberedRootPath())

  ipcMain.handle('hospitals:list', () => {
    const { rootPath } = getCachedConfig()
    return listHospitals(rootPath)
  })

  ipcMain.handle('hospitals:create', (_e, name: string) => {
    const { rootPath } = getCachedConfig()
    return createHospital(rootPath, name)
  })

  ipcMain.handle('hospitals:rename', (_e, folderName: string, newName: string) => {
    const { rootPath } = getCachedConfig()
    return renameHospital(rootPath, folderName, newName)
  })

  ipcMain.handle('hospitals:delete', (_e, folderName: string) => {
    const { rootPath } = getCachedConfig()
    return deleteHospital(rootPath, folderName)
  })

  // Templates
  ipcMain.handle('templates:list', () => {
    const { rootPath } = getCachedConfig()
    return listTemplates(rootPath)
  })

  ipcMain.handle('templates:create', (_e, name: string, sections: TemplateSection[]) => {
    const { rootPath } = getCachedConfig()
    return createTemplate(rootPath, name, sections)
  })

  ipcMain.handle(
    'templates:update',
    (_e, templateId: string, updates: { name?: string; sections?: TemplateSection[] }) => {
      const { rootPath } = getCachedConfig()
      return updateTemplate(rootPath, templateId, updates)
    }
  )

  ipcMain.handle('templates:setArchived', (_e, templateId: string, archived: boolean) => {
    const { rootPath } = getCachedConfig()
    return setTemplateArchived(rootPath, templateId, archived)
  })

  ipcMain.handle('templates:delete', (_e, templateId: string) => {
    const { rootPath } = getCachedConfig()
    return deleteTemplate(rootPath, templateId)
  })

  // Patients
  ipcMain.handle('patients:list', (_e, hospitalFolderName: string) => {
    const { rootPath } = getCachedConfig()
    return listPatients(rootPath, hospitalFolderName)
  })

  ipcMain.handle('patients:get', (_e, hospitalFolderName: string, patientId: string) => {
    const { rootPath } = getCachedConfig()
    return getPatient(rootPath, hospitalFolderName, patientId)
  })

  ipcMain.handle(
    'patients:create',
    (
      _e,
      hospitalFolderName: string,
      hospitalId: string,
      templateId: string,
      templateVersion: number,
      fields: Record<string, unknown>
    ) => {
      const { rootPath } = getCachedConfig()
      return createPatient(rootPath, hospitalFolderName, hospitalId, templateId, templateVersion, fields)
    }
  )

  ipcMain.handle(
    'patients:update',
    (_e, hospitalFolderName: string, patientId: string, fields: Record<string, unknown>) => {
      const { rootPath } = getCachedConfig()
      return updatePatient(rootPath, hospitalFolderName, patientId, fields)
    }
  )

  ipcMain.handle('patients:delete', (_e, hospitalFolderName: string, patientId: string) => {
    const { rootPath } = getCachedConfig()
    return deletePatient(rootPath, hospitalFolderName, patientId)
  })

  ipcMain.handle('patients:getFieldSuggestions', (_e, hospitalFolderName: string, fieldId: string) => {
    const { rootPath } = getCachedConfig()
    return getFieldSuggestions(rootPath, hospitalFolderName, fieldId)
  })

  ipcMain.handle('patients:rebuildAllExcel', () => {
    const { rootPath } = getCachedConfig()
    return rebuildAllExcel(rootPath)
  })

  ipcMain.handle('patients:openExcel', (_e, hospitalFolderName: string, patientId: string) => {
    const { rootPath } = getCachedConfig()
    return shell.openPath(patientXlsxPath(rootPath, hospitalFolderName, patientId))
  })

  // Visits
  ipcMain.handle('visits:list', (_e, hospitalFolderName: string, patientId: string) => {
    const { rootPath } = getCachedConfig()
    return listVisits(rootPath, hospitalFolderName, patientId)
  })

  ipcMain.handle(
    'visits:create',
    async (
      _e,
      hospitalFolderName: string,
      patientId: string,
      data: { date: string; notes: string; fields: Record<string, unknown> }
    ) => {
      const { rootPath } = getCachedConfig()
      const visit = await createVisit(rootPath, hospitalFolderName, patientId, data)
      await syncPatientExcel(rootPath, hospitalFolderName, patientId)
      return visit
    }
  )

  // Attachments
  ipcMain.handle('attachments:list', (_e, hospitalFolderName: string, patientId: string) => {
    const { rootPath } = getCachedConfig()
    return listAttachments(rootPath, hospitalFolderName, patientId)
  })

  ipcMain.handle(
    'attachments:add',
    async (_e, hospitalFolderName: string, patientId: string, sourceFilePath: string, notes: string) => {
      const { rootPath } = getCachedConfig()
      const attachment = await addAttachment(rootPath, hospitalFolderName, patientId, sourceFilePath, notes)
      await syncPatientExcel(rootPath, hospitalFolderName, patientId)
      return attachment
    }
  )

  ipcMain.handle(
    'attachments:remove',
    async (_e, hospitalFolderName: string, patientId: string, attachmentId: string) => {
      const { rootPath } = getCachedConfig()
      await removeAttachment(rootPath, hospitalFolderName, patientId, attachmentId)
      await syncPatientExcel(rootPath, hospitalFolderName, patientId)
    }
  )

  ipcMain.handle(
    'attachments:open',
    (_e, hospitalFolderName: string, patientId: string, filename: string) => {
      const { rootPath } = getCachedConfig()
      return shell.openPath(`${rootPath}/Hospitals/${hospitalFolderName}/Patients/${patientId}/attachments/${filename}`)
    }
  )

  // Backup
  ipcMain.handle('backup:create', () => {
    const { rootPath } = getCachedConfig()
    return createBackup(rootPath)
  })

  ipcMain.handle('app:openRootFolder', () => {
    const { rootPath } = getCachedConfig()
    return shell.openPath(rootPath)
  })
}
