import supabase from '@/lib/supabaseClient'
import {
  CultureXeClientError,
  type ApiErrorBody,
} from '@/lib/errors/normaliseClientError'

import type {
  CreateManagedOrganisationInput,
  ManagedOrganisation,
  OrganisationFormValues,
  UpdateManagedOrganisationInput,
} from '../types'

const ADMIN_ORGANISATIONS_ENDPOINT = '/api/organisations'

type OrganisationsResponse = {
  organisations: ManagedOrganisation[]
}

type OrganisationResponse = {
  organisation: ManagedOrganisation
}

type DeleteResponse = {
  id: string
  action: 'delete'
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown | FormData
  signal?: AbortSignal
}

export class AdminOrganisationsApiError extends CultureXeClientError {
  constructor(error: unknown, status: number) {
    super(error, status, 'Unable to manage organisations.')
    this.name = 'AdminOrganisationsApiError'
  }
}

async function accessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) throw new AdminOrganisationsApiError(error, 401)
  if (!session?.access_token) {
    throw new AdminOrganisationsApiError(
      'Your session has expired. Sign in again.',
      401,
    )
  }

  return session.access_token
}

async function responseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null

  try {
    return await response.json()
  } catch {
    return null
  }
}

async function organisationsRequest<T>(
  options: RequestOptions = {},
): Promise<T> {
  const token = await accessToken()
  const multipart = options.body instanceof FormData
  let requestBody: BodyInit | undefined

  if (options.body instanceof FormData) {
    requestBody = options.body
  } else if (options.body !== undefined) {
    requestBody = JSON.stringify(options.body)
  }

  const response = await fetch(ADMIN_ORGANISATIONS_ENDPOINT, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body === undefined || multipart
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    body: requestBody,
    signal: options.signal,
  })

  const body = await responseBody(response)
  if (!response.ok) {
    const error = body as ApiErrorBody | null
    throw new AdminOrganisationsApiError(
      error ?? 'Unable to manage organisations.',
      response.status,
    )
  }

  return body as T
}

function organisationFormData(
  values: OrganisationFormValues,
  options: { id?: string; action?: string } = {},
): FormData {
  const { logo, banner, ...serializableValues } = values
  const form = new FormData()

  form.set('values', JSON.stringify(serializableValues))
  if (options.id) form.set('id', options.id)
  if (options.action) form.set('action', options.action)
  if (logo) form.set('logo', logo, logo.name)
  if (banner) form.set('banner', banner, banner.name)

  return form
}

export async function listManagedOrganisations(
  signal?: AbortSignal,
): Promise<ManagedOrganisation[]> {
  const response = await organisationsRequest<OrganisationsResponse>({ signal })
  return response.organisations
}

export async function createManagedOrganisation(
  values: CreateManagedOrganisationInput,
): Promise<ManagedOrganisation> {
  const response = await organisationsRequest<OrganisationResponse>({
    method: 'POST',
    body: organisationFormData(values),
  })

  return response.organisation
}

export async function updateManagedOrganisation(
  input: UpdateManagedOrganisationInput,
): Promise<ManagedOrganisation> {
  const { id, ...values } = input
  const response = await organisationsRequest<OrganisationResponse>({
    method: 'PATCH',
    body: organisationFormData(values, { id, action: 'update' }),
  })

  return response.organisation
}

async function setOrganisationStatus(
  id: string,
  action: 'activate' | 'deactivate',
): Promise<ManagedOrganisation> {
  const response = await organisationsRequest<OrganisationResponse>({
    method: 'PATCH',
    body: { id, action },
  })

  return response.organisation
}

export async function activateManagedOrganisation(
  id: string,
): Promise<ManagedOrganisation> {
  return setOrganisationStatus(id, 'activate')
}

export async function deactivateManagedOrganisation(
  id: string,
): Promise<ManagedOrganisation> {
  return setOrganisationStatus(id, 'deactivate')
}

export async function deleteManagedOrganisation(id: string): Promise<void> {
  await organisationsRequest<DeleteResponse>({
    method: 'DELETE',
    body: { id, action: 'delete' },
  })
}
