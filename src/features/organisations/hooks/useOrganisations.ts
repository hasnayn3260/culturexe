import { useCallback, useEffect, useRef, useState } from 'react'

import { reportClientError } from '@/lib/errors/normaliseClientError'

import {
  activateManagedOrganisation,
  createManagedOrganisation,
  deactivateManagedOrganisation,
  deleteManagedOrganisation,
  listManagedOrganisations,
  updateManagedOrganisation,
} from '../services/organisationsClient'
import type {
  CreateManagedOrganisationInput,
  ManagedOrganisation,
  UpdateManagedOrganisationInput,
} from '../types'

type OrganisationMutationName =
  | 'create'
  | 'update'
  | 'activate'
  | 'deactivate'
  | 'delete'

type PendingOrganisationMutation = {
  name: OrganisationMutationName
  organisationId: string | null
}

function errorMessage(error: unknown): string {
  return reportClientError(error, 'Something went wrong while managing organisations.')
}

export function useOrganisations() {
  const [organisations, setOrganisations] = useState<ManagedOrganisation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingMutation, setPendingMutation] =
    useState<PendingOrganisationMutation | null>(null)
  const loadController = useRef<AbortController | null>(null)

  const refetch = useCallback(async () => {
    loadController.current?.abort()
    const controller = new AbortController()
    loadController.current = controller

    setLoading(true)
    setError(null)

    try {
      const records = await listManagedOrganisations(controller.signal)
      setOrganisations(records)
    } catch (requestError) {
      if (controller.signal.aborted) return
      setError(errorMessage(requestError))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()

    return () => {
      loadController.current?.abort()
    }
  }, [refetch])

  const replaceOrganisation = useCallback(
    (updated: ManagedOrganisation) => {
      setOrganisations((current) =>
        current.map((organisation) =>
          organisation.id === updated.id ? updated : organisation),
      )
    },
    [],
  )

  const createOrganisation = useCallback(
    async (values: CreateManagedOrganisationInput) => {
      setPendingMutation({ name: 'create', organisationId: null })
      setError(null)

      try {
        const created = await createManagedOrganisation(values)
        setOrganisations((current) => [created, ...current])
        return created
      } catch (requestError) {
        setError(errorMessage(requestError))
        throw requestError
      } finally {
        setPendingMutation(null)
      }
    },
    [],
  )

  const updateOrganisation = useCallback(
    async (values: UpdateManagedOrganisationInput) => {
      setPendingMutation({ name: 'update', organisationId: values.id })
      setError(null)

      try {
        const updated = await updateManagedOrganisation(values)
        replaceOrganisation(updated)
        return updated
      } catch (requestError) {
        setError(errorMessage(requestError))
        throw requestError
      } finally {
        setPendingMutation(null)
      }
    },
    [replaceOrganisation],
  )

  const activateOrganisation = useCallback(
    async (organisationId: string) => {
      setPendingMutation({ name: 'activate', organisationId })
      setError(null)

      try {
        const updated = await activateManagedOrganisation(organisationId)
        replaceOrganisation(updated)
        return updated
      } catch (requestError) {
        setError(errorMessage(requestError))
        throw requestError
      } finally {
        setPendingMutation(null)
      }
    },
    [replaceOrganisation],
  )

  const deactivateOrganisation = useCallback(
    async (organisationId: string) => {
      setPendingMutation({ name: 'deactivate', organisationId })
      setError(null)

      try {
        const updated = await deactivateManagedOrganisation(organisationId)
        replaceOrganisation(updated)
        return updated
      } catch (requestError) {
        setError(errorMessage(requestError))
        throw requestError
      } finally {
        setPendingMutation(null)
      }
    },
    [replaceOrganisation],
  )

  const deleteOrganisation = useCallback(async (organisationId: string) => {
    setPendingMutation({ name: 'delete', organisationId })
    setError(null)

    try {
      await deleteManagedOrganisation(organisationId)
      setOrganisations((current) =>
        current.filter((organisation) => organisation.id !== organisationId),
      )
    } catch (requestError) {
      setError(errorMessage(requestError))
      throw requestError
    } finally {
      setPendingMutation(null)
    }
  }, [])

  return {
    organisations,
    loading,
    error,
    pendingMutation,
    isMutating: pendingMutation !== null,
    refetch,
    createOrganisation,
    updateOrganisation,
    activateOrganisation,
    deactivateOrganisation,
    deleteOrganisation,
  }
}
