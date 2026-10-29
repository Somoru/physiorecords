import { hash, verify } from '@node-rs/argon2'

export async function hashSecret(plain: string): Promise<string> {
  return hash(plain)
}

export async function verifySecret(plain: string, hashed: string): Promise<boolean> {
  try {
    return await verify(hashed, plain)
  } catch {
    return false
  }
}
