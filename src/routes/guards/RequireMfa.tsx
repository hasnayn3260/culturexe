import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import MfaChallenge from '@/features/mfa/components/MfaChallenge'
import MfaSetup from '@/features/mfa/components/MfaSetup'
import {
  getMfaAssuranceState,
  listVerifiedTotpFactors,
} from '@/features/mfa/services/mfa'
import supabase from '@/lib/supabaseClient'

type RequireMfaProps = {
  children: ReactNode
}

type MfaGateState = 'loading' | 'setup' | 'challenge' | 'verified' | 'error'

function MfaPage({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EEF5F9] p-4 sm:p-6">
      <section className="w-full max-w-xl rounded-[18px] bg-white p-5 shadow-[0_24px_70px_rgba(13,31,60,0.14)] sm:p-7 lg:p-8">
        {children}
      </section>
    </main>
  )
}

export default function RequireMfa({ children }: RequireMfaProps) {
  const [gateState, setGateState] = useState<MfaGateState>('loading')
  const [error, setError] = useState('')

  const checkMfaState = useCallback(async () => {
    setGateState('loading')
    setError('')

    try {
      const [assurance, factors] = await Promise.all([
        getMfaAssuranceState(),
        listVerifiedTotpFactors(),
      ])

      if (assurance.currentLevel === 'aal2') {
        setGateState('verified')
        return
      }

      setGateState(factors.length > 0 ? 'challenge' : 'setup')
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not verify your account security level.',
      )
      setGateState('error')
    }
  }, [])

  useEffect(() => {
    void checkMfaState()
  }, [checkMfaState])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (gateState === 'verified') return children

  if (gateState === 'loading') {
    return (
      <MfaPage>
        <div className="flex min-h-48 items-center justify-center gap-2 text-[13px] text-[#8A9BB0]">
          <LoaderCircle className="size-4 animate-spin" />
          Checking account security…
        </div>
      </MfaPage>
    )
  }

  if (gateState === 'error') {
    return (
      <MfaPage>
        <Alert className="border-[rgba(232,86,58,0.25)] bg-[#FDE8E3] text-[#C0392B]">
          <CircleAlert />
          <AlertDescription className="space-y-4 text-[#C0392B]">
            <p>{error}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void checkMfaState()}
                className="bg-[#1BBFB0] text-white hover:bg-[#16AFA1]"
              >
                <RefreshCw />
                Try again
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleSignOut()}
                className="border-[rgba(232,86,58,0.25)] bg-white text-[#C0392B]"
              >
                Sign out
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </MfaPage>
    )
  }

  if (gateState === 'setup') {
    return (
      <MfaPage>
        <MfaSetup
          factorName="CultureXe Authenticator"
          onComplete={() => checkMfaState()}
          onCancel={() => void handleSignOut()}
        />
      </MfaPage>
    )
  }

  return (
    <MfaPage>
      <MfaChallenge
        onVerified={() => checkMfaState()}
        onCancel={() => void handleSignOut()}
      />
    </MfaPage>
  )
}
