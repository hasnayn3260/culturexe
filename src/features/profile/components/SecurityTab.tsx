import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  CircleAlert,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import MfaSetup from '@/features/mfa/components/MfaSetup'
import {
  getMfaAssuranceState,
  listVerifiedTotpFactors,
  type MfaAssuranceState,
} from '@/features/mfa/services/mfa'

type TotpFactor = Awaited<ReturnType<typeof listVerifiedTotpFactors>>[number]

type SecurityTabProps = {
  refreshKey?: string | number
  onMfaEnabled?: (factorId: string) => void | Promise<void>
}

type SecurityState = {
  assurance: MfaAssuranceState | null
  factors: TotpFactor[]
}

const INITIAL_STATE: SecurityState = {
  assurance: null,
  factors: [],
}

function formatEnrollmentDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export default function SecurityTab({
  refreshKey = 0,
  onMfaEnabled,
}: SecurityTabProps) {
  const [state, setState] = useState<SecurityState>(INITIAL_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [localRefreshKey, setLocalRefreshKey] = useState(0)

  const loadSecurityState = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [assurance, factors] = await Promise.all([
        getMfaAssuranceState(),
        listVerifiedTotpFactors(),
      ])
      setState({ assurance, factors })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not load account security settings.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSecurityState()
  }, [loadSecurityState, refreshKey, localRefreshKey])

  async function handleMfaEnabled(factorId: string) {
    await onMfaEnabled?.(factorId)
    setShowSetup(false)
    setLocalRefreshKey((current) => current + 1)
  }

  const mfaEnabled = state.factors.length > 0
  const sessionAtAal2 = state.assurance?.currentLevel === 'aal2'
  const canAddFactor = state.factors.length < 2

  if (showSetup) {
    return (
      <MfaSetup
        onComplete={handleMfaEnabled}
        onCancel={() => setShowSetup(false)}
        factorName={mfaEnabled ? 'CultureXe Backup Authenticator' : 'CultureXe Authenticator'}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center gap-2 text-[13px] text-[#8A9BB0]">
        <LoaderCircle className="size-4 animate-spin" />
        Loading security settings…
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-[rgba(232,86,58,0.25)] bg-[#FDE8E3] text-[#C0392B]">
        <CircleAlert />
        <AlertDescription className="space-y-3 text-[#C0392B]">
          <p>{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadSecurityState()}
            className="border-[rgba(232,86,58,0.25)] bg-white text-[#C0392B] hover:bg-white/70"
          >
            <RefreshCw />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="w-full space-y-5 text-left">
      <Card className="w-full items-stretch gap-0 rounded-2xl bg-white py-0 ring-[#DCE4EE] shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
        <CardHeader className="flex! w-full flex-row items-start gap-4 px-6 py-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#E0F7F5] text-[#0A7A72]">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#0D1F3C]">
              Multi-factor authentication
            </CardTitle>
            <CardDescription className="mt-1 max-w-2xl text-sm leading-6 text-[#4A6380]">
              Protect your account with a six-digit code from an authenticator app after entering your password.
            </CardDescription>
          </div>
          <div className="shrink-0 pt-0.5">
            <Badge
              variant="outline"
              className={
                mfaEnabled
                  ? 'shrink-0 border-[rgba(27,191,176,0.30)] bg-[#E0F7F5] text-[#0A7A72]'
                  : 'shrink-0 border-[#E2E8F0] bg-[#F7F9FC] text-[#8A9BB0]'
              }
            >
              {mfaEnabled ? 'Enabled' : 'Not set up'}
            </Badge>
          </div>
        </CardHeader>

        <Separator className="bg-[#E2E8F0]" />

        <CardContent className="w-full space-y-4 px-6 py-5">
          {mfaEnabled ? (
            <div className="space-y-3">
              {state.factors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#E8EDF3] bg-[#F7F9FC] px-4 py-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-white text-[#3A8FC4] ring-1 ring-[#E2E8F0]">
                    <Smartphone className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-[#0D1F3C]">
                      {factor.friendly_name || 'Authenticator app'}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-[#8A9BB0]">
                      Added {formatEnrollmentDate(factor.created_at)}
                    </div>
                  </div>
                  <CheckCircle2 className="size-4 shrink-0 text-[#1BBFB0]" />
                </div>
              ))}

              {!sessionAtAal2 && state.assurance?.requiresChallenge && (
                <Alert className="border-[rgba(201,184,130,0.35)] bg-[#FAF6EC] text-[#7A652B]">
                  <KeyRound />
                  <AlertDescription className="text-[#7A652B]">
                    Your account has MFA enabled, but this session still needs authenticator verification.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="rounded-[10px] bg-[#F7F9FC] px-4 py-4 text-[13px] leading-5 text-[#4A6380]">
              No authenticator is connected to this account yet.
            </div>
          )}

          {canAddFactor && (
            <Button
              type="button"
              onClick={() => setShowSetup(true)}
              className="h-10 rounded-[9px] bg-[#1BBFB0] px-5 text-[13px] font-bold text-white hover:bg-[#16AFA1]"
            >
              <ShieldCheck />
              {mfaEnabled ? 'Add backup authenticator' : 'Set up authenticator'}
            </Button>
          )}

          {!canAddFactor && (
            <p className="text-xs text-[#8A9BB0]">
              Two authenticators are already connected. Remove one before adding another.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
