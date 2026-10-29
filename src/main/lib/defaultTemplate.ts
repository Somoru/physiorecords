import { randomUUID } from 'crypto'
import type { Template } from '../../shared/types'

export function buildDefaultTemplate(): Template {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    name: 'General Physiotherapy',
    version: 1,
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        id: randomUUID(),
        name: 'Personal Information',
        fields: [
          { id: 'name', label: 'Patient Name', type: 'text', required: true },
          { id: 'age', label: 'Age', type: 'number', required: false },
          { id: 'phone', label: 'Phone', type: 'phone', required: true },
          { id: 'occupation', label: 'Occupation', type: 'autocomplete', required: false }
        ]
      },
      {
        id: randomUUID(),
        name: 'Medical History',
        fields: [
          { id: 'diagnosis', label: 'Diagnosis', type: 'autocomplete', required: true },
          { id: 'doctor', label: 'Referring Doctor', type: 'autocomplete', required: false },
          { id: 'pain_scale', label: 'Pain Scale (0-10)', type: 'number', required: false }
        ]
      }
    ]
  }
}
