import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  AppConfig,
  AppStatus,
  Attachment,
  DeleteHospitalResult,
  DeleteTemplateResult,
  HospitalSummary,
  OnboardingPayload,
  Patient,
  Template,
  TemplateSection,
  Visit
} from '../shared/types'

const api = {
  getStatus: (): Promise<AppStatus> => ipcRenderer.invoke('app:getStatus'),
  pickFolder: (): Promise<string | null> => ipcRenderer.invoke('app:pickFolder'),
  pickFile: (): Promise<string | null> => ipcRenderer.invoke('app:pickFile'),
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  completeOnboarding: (payload: OnboardingPayload): Promise<AppConfig> =>
    ipcRenderer.invoke('app:completeOnboarding', payload),
  unlock: (password: string): Promise<boolean> => ipcRenderer.invoke('app:unlock', password),
  getSecurityQuestion: (): Promise<string | null> => ipcRenderer.invoke('app:getSecurityQuestion'),
  resetPasswordWithSecurityAnswer: (answer: string, newPassword: string): Promise<boolean> =>
    ipcRenderer.invoke('app:resetPasswordWithSecurityAnswer', answer, newPassword),
  changePassword: (current: string, next: string): Promise<boolean> =>
    ipcRenderer.invoke('app:changePassword', current, next),
  updateProfile: (updates: { name?: string; theme?: 'light' | 'dark' }): Promise<AppConfig> =>
    ipcRenderer.invoke('app:updateProfile', updates),
  getConfig: (): Promise<AppConfig | null> => ipcRenderer.invoke('app:getConfig'),
  relinkRoot: (rootPath: string): Promise<{ ok: boolean; status?: AppStatus }> =>
    ipcRenderer.invoke('app:relinkRoot', rootPath),
  forgetRoot: (): Promise<boolean> => ipcRenderer.invoke('app:forgetRoot'),
  getRememberedRootPath: (): Promise<string | null> => ipcRenderer.invoke('app:getRememberedRootPath'),
  openRootFolder: (): Promise<string> => ipcRenderer.invoke('app:openRootFolder'),

  listHospitals: (): Promise<HospitalSummary[]> => ipcRenderer.invoke('hospitals:list'),
  createHospital: (name: string): Promise<HospitalSummary> => ipcRenderer.invoke('hospitals:create', name),
  renameHospital: (folderName: string, newName: string): Promise<HospitalSummary> =>
    ipcRenderer.invoke('hospitals:rename', folderName, newName),
  deleteHospital: (folderName: string): Promise<DeleteHospitalResult> =>
    ipcRenderer.invoke('hospitals:delete', folderName),

  listTemplates: (): Promise<Template[]> => ipcRenderer.invoke('templates:list'),
  createTemplate: (name: string, sections: TemplateSection[]): Promise<Template> =>
    ipcRenderer.invoke('templates:create', name, sections),
  updateTemplate: (
    templateId: string,
    updates: { name?: string; sections?: TemplateSection[] }
  ): Promise<Template> => ipcRenderer.invoke('templates:update', templateId, updates),
  setTemplateArchived: (templateId: string, archived: boolean): Promise<Template> =>
    ipcRenderer.invoke('templates:setArchived', templateId, archived),
  deleteTemplate: (templateId: string): Promise<DeleteTemplateResult> =>
    ipcRenderer.invoke('templates:delete', templateId),

  listPatients: (hospitalFolderName: string): Promise<Patient[]> =>
    ipcRenderer.invoke('patients:list', hospitalFolderName),
  getPatient: (hospitalFolderName: string, patientId: string): Promise<Patient | null> =>
    ipcRenderer.invoke('patients:get', hospitalFolderName, patientId),
  createPatient: (
    hospitalFolderName: string,
    hospitalId: string,
    templateId: string,
    templateVersion: number,
    fields: Record<string, unknown>
  ): Promise<Patient> =>
    ipcRenderer.invoke('patients:create', hospitalFolderName, hospitalId, templateId, templateVersion, fields),
  updatePatient: (
    hospitalFolderName: string,
    patientId: string,
    fields: Record<string, unknown>
  ): Promise<Patient> => ipcRenderer.invoke('patients:update', hospitalFolderName, patientId, fields),
  deletePatient: (hospitalFolderName: string, patientId: string): Promise<void> =>
    ipcRenderer.invoke('patients:delete', hospitalFolderName, patientId),
  getFieldSuggestions: (hospitalFolderName: string, fieldId: string): Promise<string[]> =>
    ipcRenderer.invoke('patients:getFieldSuggestions', hospitalFolderName, fieldId),
  rebuildAllExcel: (): Promise<number> => ipcRenderer.invoke('patients:rebuildAllExcel'),
  openPatientExcel: (hospitalFolderName: string, patientId: string): Promise<string> =>
    ipcRenderer.invoke('patients:openExcel', hospitalFolderName, patientId),

  listVisits: (hospitalFolderName: string, patientId: string): Promise<Visit[]> =>
    ipcRenderer.invoke('visits:list', hospitalFolderName, patientId),
  createVisit: (
    hospitalFolderName: string,
    patientId: string,
    data: { date: string; notes: string; fields: Record<string, unknown> }
  ): Promise<Visit> => ipcRenderer.invoke('visits:create', hospitalFolderName, patientId, data),

  listAttachments: (hospitalFolderName: string, patientId: string): Promise<Attachment[]> =>
    ipcRenderer.invoke('attachments:list', hospitalFolderName, patientId),
  addAttachment: (
    hospitalFolderName: string,
    patientId: string,
    sourceFilePath: string,
    notes: string
  ): Promise<Attachment> =>
    ipcRenderer.invoke('attachments:add', hospitalFolderName, patientId, sourceFilePath, notes),
  removeAttachment: (hospitalFolderName: string, patientId: string, attachmentId: string): Promise<void> =>
    ipcRenderer.invoke('attachments:remove', hospitalFolderName, patientId, attachmentId),
  openAttachment: (hospitalFolderName: string, patientId: string, filename: string): Promise<string> =>
    ipcRenderer.invoke('attachments:open', hospitalFolderName, patientId, filename),

  createBackup: (): Promise<string> => ipcRenderer.invoke('backup:create')
}

export type PhysioApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
