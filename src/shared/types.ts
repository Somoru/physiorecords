export interface AppConfig {
  name: string
  rootPath: string
  auth: {
    passwordHash: string
    securityQuestion: string
    securityAnswerHash: string
  }
  theme: 'light' | 'dark'
  createdAt: string
  lastOpenedAt: string
}

export type AppStatus =
  | { state: 'needs-onboarding' }
  | { state: 'locked'; name: string }
  | { state: 'missing-root'; name: string; rootPath: string }

export interface OnboardingPayload {
  name: string
  password: string
  securityQuestion: string
  securityAnswer: string
  rootPath: string
  hospitalName?: string
}

export interface Hospital {
  id: string
  name: string
  createdAt: string
}

export interface HospitalSummary extends Hospital {
  folderName: string
  patientCount: number
}

export type DeleteHospitalResult =
  | { ok: true }
  | { ok: false; reason: 'has-patients'; patientCount: number }

export type FieldType =
  | 'text'
  | 'paragraph'
  | 'number'
  | 'phone'
  | 'email'
  | 'date'
  | 'dropdown'
  | 'checkbox'
  | 'autocomplete'
  | 'rating'
  | 'image'
  | 'file'

export interface TemplateField {
  id: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
  defaultValue?: string | number | boolean
}

export interface TemplateSection {
  id: string
  name: string
  fields: TemplateField[]
}

export interface Template {
  id: string
  name: string
  version: number
  sections: TemplateSection[]
  createdAt: string
  updatedAt: string
  archived?: boolean
}

export interface Patient {
  id: string
  templateId: string
  templateVersion: number
  hospitalId: string
  createdAt: string
  updatedAt: string
  fields: Record<string, unknown>
  status: 'active' | 'inactive'
}

export interface Visit {
  id: string
  date: string
  notes: string
  fields: Record<string, unknown>
  createdAt: string
}

export interface Attachment {
  id: string
  filename: string
  notes: string
  addedAt: string
}

export interface PatientWithHospital extends Patient {
  hospitalFolderName: string
}

export type DeleteTemplateResult = { ok: true } | { ok: false; reason: 'in-use'; patientCount: number }

