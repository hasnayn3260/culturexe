import { useCallback, useEffect, useRef, useState } from 'react'

import { reportClientError } from '@/lib/errors/normaliseClientError'

import {
  activateManagedUser,
  createManagedUser,
  deactivateManagedUser,
  deleteManagedUser,
  importManagedUsers,
  listManagedUsers,
  updateManagedUser,
} from '../services/usersClient'
import type { UserImportValues } from '../import/userImportSchema'
import type {
  CreateManagedUserInput,
  ManagedUser,
  UpdateManagedUserInput,
} from '../types'

type MutationName =
  | 'create'
  | 'update'
  | 'activate'
  | 'deactivate'
  | 'delete'
  | 'import'

type PendingMutation = {
  name: MutationName
  userId: string | null
}

function errorMessage(error: unknown): string {
  return reportClientError(error, 'Something went wrong while managing users.')
}

export function useUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingMutation, setPendingMutation] =
    useState<PendingMutation | null>(null)
  const loadController = useRef<AbortController | null>(null)

  const refetch = useCallback(async () => {
    loadController.current?.abort()
    const controller = new AbortController()
    loadController.current = controller

    setLoading(true)
    setError(null)

    try {
      const records = await listManagedUsers(controller.signal)
      setUsers(records)
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

  const createUser = useCallback(async (values: CreateManagedUserInput) => {
    setPendingMutation({ name: 'create', userId: null })
    setError(null)

    try {
      const created = await createManagedUser(values)
      setUsers((current) => [created, ...current])
      return created
    } catch (requestError) {
      const message = errorMessage(requestError)
      setError(message)
      throw requestError
    } finally {
      setPendingMutation(null)
    }
  }, [])

  const updateUser = useCallback(async (values: UpdateManagedUserInput) => {
    setPendingMutation({ name: 'update', userId: values.id })
    setError(null)

    try {
      const updated = await updateManagedUser(values)
      setUsers((current) =>
        current.map((user) => user.id === updated.id ? updated : user),
      )
      return updated
    } catch (requestError) {
      const message = errorMessage(requestError)
      setError(message)
      throw requestError
    } finally {
      setPendingMutation(null)
    }
  }, [])

  const activateUser = useCallback(async (userId: string) => {
    setPendingMutation({ name: 'activate', userId })
    setError(null)

    try {
      await activateManagedUser(userId)
      setUsers((current) =>
        current.map((user) =>
          user.id === userId ? { ...user, active: true } : user),
      )
    } catch (requestError) {
      const message = errorMessage(requestError)
      setError(message)
      throw requestError
    } finally {
      setPendingMutation(null)
    }
  }, [])

  const deactivateUser = useCallback(async (userId: string) => {
    setPendingMutation({ name: 'deactivate', userId })
    setError(null)

    try {
      await deactivateManagedUser(userId)
      setUsers((current) =>
        current.map((user) =>
          user.id === userId ? { ...user, active: false } : user),
      )
    } catch (requestError) {
      const message = errorMessage(requestError)
      setError(message)
      throw requestError
    } finally {
      setPendingMutation(null)
    }
  }, [])

  const deleteUser = useCallback(async (userId: string) => {
    setPendingMutation({ name: 'delete', userId })
    setError(null)

    try {
      await deleteManagedUser(userId)
      setUsers((current) => current.filter((user) => user.id !== userId))
    } catch (requestError) {
      const message = errorMessage(requestError)
      setError(message)
      throw requestError
    } finally {
      setPendingMutation(null)
    }
  }, [])

  const importUsers = useCallback(async (
    organisationId: string,
    rows: UserImportValues[],
  ) => {
    setPendingMutation({ name: 'import', userId: null })
    setError(null)

    try {
      const result = await importManagedUsers(organisationId, rows)
      await refetch()
      return result
    } catch (requestError) {
      const message = errorMessage(requestError)
      setError(message)
      throw requestError
    } finally {
      setPendingMutation(null)
    }
  }, [refetch])

  return {
    users,
    loading,
    error,
    pendingMutation,
    isMutating: pendingMutation !== null,
    refetch,
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
    deleteUser,
    importUsers,
  }
}
