import supabase from '@/lib/supabaseClient'

import type {
  CreateManagedUserInput,
  ManagedUser,
  UpdateManagedUserInput,
  UserAction,
} from '../types'
import type {
  UserImportResult,
  UserImportValues,
} from '../import/userImportSchema'

const ADMIN_USERS_ENDPOINT = '/api/users'
const ADMIN_USERS_IMPORT_ENDPOINT = '/api/users/import'

type ApiErrorBody = {
  error?: string
  message?: string
  results?: unknown
}

type UsersResponse = {
  users: ManagedUser[]
}

type UserResponse = {
  user: ManagedUser
}

type ActionResponse = {
  id: string
  action: UserAction
}

export type BulkUserImportResponse = {
  results: UserImportResult[]
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export class AdminUsersApiError extends Error {
  readonly status: number
  readonly results: UserImportResult[]

  constructor(
    message: string,
    status: number,
    results: UserImportResult[] = [],
  ) {
    super(message)
    this.name = 'AdminUsersApiError'
    this.status = status
    this.results = results
  }
}

function isUserImportResult(value: unknown): value is UserImportResult {
  if (!value || typeof value !== 'object') return false

  const result = value as Record<string, unknown>
  const statuses = ['pending', 'created', 'updated', 'skipped', 'failed']

  return typeof result.rowNumber === 'number' &&
    typeof result.email === 'string' &&
    typeof result.status === 'string' && statuses.includes(result.status) &&
    (result.message === undefined || typeof result.message === 'string')
}

function readImportResults(value: unknown): UserImportResult[] {
  return Array.isArray(value) ? value.filter(isUserImportResult) : []
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) throw new AdminUsersApiError(error.message, 401)
  if (!session?.access_token) {
    throw new AdminUsersApiError('Your session has expired. Sign in again.', 401)
  }

  return session.access_token
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null

  try {
    return await response.json()
  } catch {
    return null
  }
}

async function adminUsersRequest<T>(
  options: RequestOptions = {},
  endpoint = ADMIN_USERS_ENDPOINT,
): Promise<T> {
  const accessToken = await getAccessToken()
  const response = await fetch(endpoint, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    body: options.body === undefined
      ? undefined
      : JSON.stringify(options.body),
    signal: options.signal,
  })

  const body = await readResponseBody(response)

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null
    throw new AdminUsersApiError(
      errorBody?.error || errorBody?.message || 'Unable to manage users.',
      response.status,
      readImportResults(errorBody?.results),
    )
  }

  return body as T
}

export async function listManagedUsers(
  signal?: AbortSignal,
): Promise<ManagedUser[]> {
  const response = await adminUsersRequest<UsersResponse>({ signal })
  return response.users
}

export async function createManagedUser(
  values: CreateManagedUserInput,
): Promise<ManagedUser> {
  const response = await adminUsersRequest<UserResponse>({
    method: 'POST',
    body: { values },
  })

  return response.user
}

export async function updateManagedUser(
  input: UpdateManagedUserInput,
): Promise<ManagedUser> {
  const { id, ...values } = input
  const response = await adminUsersRequest<UserResponse>({
    method: 'PATCH',
    body: { id, action: 'update', values },
  })

  return response.user
}

async function setManagedUserAction(
  id: string,
  action: Exclude<UserAction, 'delete'>,
): Promise<void> {
  await adminUsersRequest<ActionResponse>({
    method: 'PATCH',
    body: { id, action },
  })
}

export async function activateManagedUser(id: string): Promise<void> {
  await setManagedUserAction(id, 'activate')
}

export async function deactivateManagedUser(id: string): Promise<void> {
  await setManagedUserAction(id, 'deactivate')
}

export async function deleteManagedUser(id: string): Promise<void> {
  await adminUsersRequest<ActionResponse>({
    method: 'DELETE',
    body: { id, action: 'delete' },
  })
}

export async function importManagedUsers(
  organisationId: string,
  rows: UserImportValues[],
): Promise<BulkUserImportResponse> {
  return adminUsersRequest<BulkUserImportResponse>({
    method: 'POST',
    body: { organisationId, rows },
  }, ADMIN_USERS_IMPORT_ENDPOINT)
}
