import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'
import type { AppConfig, AppStatus, Hospital, OnboardingPayload } from '../../shared/types'
import { atomicWriteJson, pathExists, readJson } from './atomicWrite'
import { getRememberedRootPath, setRememberedRootPath } from './appState'
import {
  configPath,
  hospitalJsonPath,
  hospitalsDir,
  patientsDir,
  backupsDir,
  templatesPath,
  toFolderName
} from './paths'
import { hashSecret, verifySecret } from './hash'
import { buildDefaultTemplate } from './defaultTemplate'

let cachedConfig: AppConfig | null = null
let cachedRootPath: string | null = null

export async function getAppStatus(): Promise<AppStatus> {
  const rootPath = await getRememberedRootPath()
  if (!rootPath) return { state: 'needs-onboarding' }

  const cfgPath = configPath(rootPath)
  const exists = await pathExists(cfgPath)
  if (!exists) return { state: 'missing-root', name: '', rootPath }

  const config = await readJson<AppConfig>(cfgPath)
  if (!config) return { state: 'missing-root', name: '', rootPath }

  cachedConfig = config
  cachedRootPath = rootPath
  return { state: 'locked', name: config.name }
}

export async function completeOnboarding(payload: OnboardingPayload): Promise<void> {
  const { name, password, securityQuestion, securityAnswer, rootPath, hospitalName } = payload

  await fs.mkdir(rootPath, { recursive: true })
  await fs.mkdir(hospitalsDir(rootPath), { recursive: true })
  await fs.mkdir(backupsDir(rootPath), { recursive: true })

  const now = new Date().toISOString()
  const config: AppConfig = {
    name,
    rootPath,
    auth: {
      passwordHash: await hashSecret(password),
      securityQuestion,
      securityAnswerHash: await hashSecret(securityAnswer.trim().toLowerCase())
    },
    theme: 'light',
    createdAt: now,
    lastOpenedAt: now
  }

  await atomicWriteJson(configPath(rootPath), config)
  await atomicWriteJson(templatesPath(rootPath), { templates: [buildDefaultTemplate()] })

  if (hospitalName && hospitalName.trim()) {
    const folderName = toFolderName(hospitalName.trim())
    const hospital: Hospital = { id: randomUUID(), name: hospitalName.trim(), createdAt: now }
    await fs.mkdir(patientsDir(rootPath, folderName), { recursive: true })
    await atomicWriteJson(hospitalJsonPath(rootPath, folderName), hospital)
  }

  await setRememberedRootPath(rootPath)
  cachedConfig = config
  cachedRootPath = rootPath
}

export function getCachedConfig(): { config: AppConfig; rootPath: string } {
  if (!cachedConfig || !cachedRootPath) {
    throw new Error('No config loaded. App must be unlocked first.')
  }
  return { config: cachedConfig, rootPath: cachedRootPath }
}

export async function unlock(password: string): Promise<boolean> {
  const rootPath = await getRememberedRootPath()
  if (!rootPath) return false
  const config = await readJson<AppConfig>(configPath(rootPath))
  if (!config) return false

  const ok = await verifySecret(password, config.auth.passwordHash)
  if (!ok) return false

  config.lastOpenedAt = new Date().toISOString()
  await atomicWriteJson(configPath(rootPath), config)

  cachedConfig = config
  cachedRootPath = rootPath
  return true
}

export async function getSecurityQuestion(): Promise<string | null> {
  const rootPath = await getRememberedRootPath()
  if (!rootPath) return null
  const config = await readJson<AppConfig>(configPath(rootPath))
  return config?.auth.securityQuestion ?? null
}

export async function verifySecurityAnswerAndReset(
  answer: string,
  newPassword: string
): Promise<boolean> {
  const rootPath = await getRememberedRootPath()
  if (!rootPath) return false
  const config = await readJson<AppConfig>(configPath(rootPath))
  if (!config) return false

  const ok = await verifySecret(answer.trim().toLowerCase(), config.auth.securityAnswerHash)
  if (!ok) return false

  config.auth.passwordHash = await hashSecret(newPassword)
  await atomicWriteJson(configPath(rootPath), config)
  cachedConfig = config
  cachedRootPath = rootPath
  return true
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  const { config, rootPath } = getCachedConfig()
  const ok = await verifySecret(currentPassword, config.auth.passwordHash)
  if (!ok) return false
  config.auth.passwordHash = await hashSecret(newPassword)
  await atomicWriteJson(configPath(rootPath), config)
  return true
}

export async function updateProfile(updates: { name?: string; theme?: 'light' | 'dark' }): Promise<AppConfig> {
  const { config, rootPath } = getCachedConfig()
  if (updates.name) config.name = updates.name
  if (updates.theme) config.theme = updates.theme
  await atomicWriteJson(configPath(rootPath), config)
  return config
}
