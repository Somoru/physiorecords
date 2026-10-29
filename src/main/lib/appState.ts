import { app } from 'electron'
import { join } from 'path'
import { atomicWriteJson, readJson } from './atomicWrite'

interface AppStateFile {
  rootPath: string | null
}

function statePath(): string {
  return join(app.getPath('userData'), 'app-state.json')
}

export async function getRememberedRootPath(): Promise<string | null> {
  const state = await readJson<AppStateFile>(statePath())
  return state?.rootPath ?? null
}

export async function setRememberedRootPath(rootPath: string): Promise<void> {
  await atomicWriteJson(statePath(), { rootPath } satisfies AppStateFile)
}
