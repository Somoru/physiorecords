import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import { randomBytes } from 'crypto'

export async function atomicWriteFile(filePath: string, contents: string): Promise<void> {
  const dir = dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  const tempPath = join(dir, `.${randomBytes(6).toString('hex')}.tmp`)
  await fs.writeFile(tempPath, contents, 'utf-8')
  await fs.rename(tempPath, filePath)
}

export async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  await atomicWriteFile(filePath, JSON.stringify(data, null, 2))
}

export async function atomicWriteBuffer(filePath: string, buffer: Buffer | Uint8Array): Promise<void> {
  const dir = dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  const tempPath = join(dir, `.${randomBytes(6).toString('hex')}.tmp`)
  await fs.writeFile(tempPath, buffer)
  await fs.rename(tempPath, filePath)
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}
