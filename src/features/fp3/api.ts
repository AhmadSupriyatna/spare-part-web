import { apiClient } from '@/lib/api-client'

export type Fp3Status = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type Fp3Disposition = 'open' | 'closed' | 'closed_with_note'

export interface Fp3PartUsage {
  id: number
  part_id: number | null
  part_name?: string
  item_master_no?: string
  is_registered: boolean
  quantity: number
  notes: string | null
}

export interface Fp3Request {
  id: number
  branch_id: number
  branch_name?: string
  code: string
  requester_name: string
  department: string
  description: string
  request_photo_url: string
  status: Fp3Status
  is_overdue: boolean
  due_date: string | null
  received_at: string | null
  received_by: number | null
  received_by_name?: string | null
  work_description: string | null
  completed_at: string | null
  executor_names: string | null
  area_condition_after: string | null
  completion_photo_url: string | null
  disposition: Fp3Disposition | null
  disposition_note: string | null
  part_usages?: Fp3PartUsage[]
  created_at: string
}

export interface SubmitFp3RequestPayload {
  requester_name: string
  department: string
  description: string
  photo: File
}

/** Unauthenticated — see PublicFp3Controller. Reached by scanning a branch's printed "Ajukan FP3" QR, no login. */
export async function submitFp3Request(branchId: number, payload: SubmitFp3RequestPayload): Promise<Fp3Request> {
  const formData = new FormData()
  formData.append('requester_name', payload.requester_name)
  formData.append('department', payload.department)
  formData.append('description', payload.description)
  formData.append('photo', payload.photo)

  const { data } = await apiClient.post<{ data: Fp3Request }>(`/public/branches/${branchId}/fp3-requests`, formData)
  return data.data
}

export async function fetchFp3RequestsForBranch(branchId: number): Promise<Fp3Request[]> {
  const { data } = await apiClient.get<{ data: Fp3Request[] }>(`/branches/${branchId}/fp3-requests`)
  return data.data
}

export async function fetchFp3Request(id: number): Promise<Fp3Request> {
  const { data } = await apiClient.get<{ data: Fp3Request }>(`/fp3-requests/${id}`)
  return data.data
}

/** Claiming a request — an optional due_date schedules it for later instead of working it right away. */
export async function receiveFp3Request(id: number, dueDate?: string | null): Promise<Fp3Request> {
  const { data } = await apiClient.post<{ data: Fp3Request }>(`/fp3-requests/${id}/receive`, {
    due_date: dueDate || undefined,
  })
  return data.data
}

/** Sets due_date only — no claim, no status change. Used when dragging an unscheduled FP3 card onto a PM Calendar day, mirroring scheduleTaskLibrary()'s "just give it a date" shape. */
export async function scheduleFp3Request(id: number, dueDate: string): Promise<Fp3Request> {
  const { data } = await apiClient.put<{ data: Fp3Request }>(`/fp3-requests/${id}/schedule`, { due_date: dueDate })
  return data.data
}

export interface CompleteFp3RequestPartInput {
  part_id?: number | null
  part_name_manual?: string | null
  quantity: number
  notes?: string | null
}

export interface CompleteFp3RequestPayload {
  work_description: string
  executor_names: string
  area_condition_after: string
  disposition: Fp3Disposition
  disposition_note?: string | null
  photo?: File | null
  parts?: CompleteFp3RequestPartInput[]
}

export async function completeFp3Request(id: number, payload: CompleteFp3RequestPayload): Promise<Fp3Request> {
  const formData = new FormData()
  formData.append('work_description', payload.work_description)
  formData.append('executor_names', payload.executor_names)
  formData.append('area_condition_after', payload.area_condition_after)
  formData.append('disposition', payload.disposition)
  if (payload.disposition_note) formData.append('disposition_note', payload.disposition_note)
  if (payload.photo) formData.append('photo', payload.photo)
  ;(payload.parts ?? []).forEach((part, index) => {
    if (part.part_id) formData.append(`parts[${index}][part_id]`, String(part.part_id))
    if (part.part_name_manual) formData.append(`parts[${index}][part_name_manual]`, part.part_name_manual)
    formData.append(`parts[${index}][quantity]`, String(part.quantity))
    if (part.notes) formData.append(`parts[${index}][notes]`, part.notes)
  })

  const { data } = await apiClient.post<{ data: Fp3Request }>(`/fp3-requests/${id}/complete`, formData)
  return data.data
}

export async function cancelFp3Request(id: number, notes?: string): Promise<Fp3Request> {
  const { data } = await apiClient.post<{ data: Fp3Request }>(`/fp3-requests/${id}/cancel`, { notes })
  return data.data
}
