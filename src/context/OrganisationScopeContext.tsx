import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export const ALL_ORGANISATIONS = 'all' as const
export type OrganisationScope = typeof ALL_ORGANISATIONS | string

type OrganisationScopeContextValue = {
  organisationScope: OrganisationScope
  setOrganisationScope: (scope: OrganisationScope) => void
}

const STORAGE_KEY = 'culturexe:consultant-organisation-scope'
const OrganisationScopeContext = createContext<OrganisationScopeContextValue | null>(null)

function initialScope(): OrganisationScope {
  if (typeof window === 'undefined') return ALL_ORGANISATIONS
  return window.localStorage.getItem(STORAGE_KEY) || ALL_ORGANISATIONS
}

export function OrganisationScopeProvider({ children }: { children: ReactNode }) {
  const [organisationScope, setScope] = useState<OrganisationScope>(initialScope)

  const value = useMemo<OrganisationScopeContextValue>(() => ({
    organisationScope,
    setOrganisationScope: (scope) => {
      setScope(scope)
      window.localStorage.setItem(STORAGE_KEY, scope)
    },
  }), [organisationScope])

  return (
    <OrganisationScopeContext.Provider value={value}>
      {children}
    </OrganisationScopeContext.Provider>
  )
}

export function useOrganisationScope(): OrganisationScopeContextValue {
  const context = useContext(OrganisationScopeContext)
  if (!context) {
    throw new Error(
      'useOrganisationScope must be used inside OrganisationScopeProvider.',
    )
  }
  return context
}
