import { useEffect, useState, type FormEvent } from 'react'
import { CircleAlert, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import {
  listVerifiedTotpFactors,
  verifyTotpFactor,
} from '@/features/mfa/services/mfa'

type TotpFactor = Awaited<ReturnType<typeof listVerifiedTotpFactors>>[number]

type MfaChallengeProps = {
  onVerified: () => void | Promise<void>
  onCancel?: () => void
}

export default function MfaChallenge({
  onVerified,
  onCancel,
}: MfaChallengeProps) {
  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadFactors() {
      setLoading(true)
      setError('')

      try {
        const verifiedFactors = await listVerifiedTotpFactors()
        if (!active) return

        setFactors(verifiedFactors)
        setFactorId(verifiedFactors[0]?.id ?? '')

        if (verifiedFactors.length === 0) {
          setError('No verified authenticator is connected to this account.')
        }
      } catch (caughtError) {
        if (!active) return
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Could not load your authenticator settings.',
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadFactors()

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!factorId || code.length !== 6) return

    setVerifying(true)
    setError('')

    try {
      await verifyTotpFactor(factorId, code)
      await onVerified()
    } catch (caughtError) {
      setCode('')
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'That code could not be verified. Try the latest code from your app.',
      )
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-56 items-center justify-center gap-2 text-[13px] text-[#8A9BB0]">
        <LoaderCircle className="size-4 animate-spin" />
        Loading authenticator…
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex size-11 items-center justify-center rounded-[11px] bg-[#E0F7F5] text-[#0A7A72]">
        <ShieldCheck className="size-5" />
      </div>

      <div>
        <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#0D1F3C]">
          Verify it’s you
        </h2>
        <p className="mt-1.5 text-[13px] leading-5 text-[#4A6380]">
          Enter the six-digit code from your authenticator app to continue.
        </p>
      </div>

      {factors.length > 1 && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs font-semibold tracking-[0.8px] text-[#8A9BB0] uppercase">
            Authenticator
          </legend>
          {factors.map((factor) => (
            <label
              key={factor.id}
              className="flex cursor-pointer items-center gap-3 rounded-[9px] bg-[#F7F9FC] px-3 py-2.5 text-[13px] font-semibold text-[#0D1F3C] ring-1 ring-[#E2E8F0]"
            >
              <input
                type="radio"
                name="mfa-factor"
                value={factor.id}
                checked={factorId === factor.id}
                onChange={() => {
                  setFactorId(factor.id)
                  setCode('')
                  setError('')
                }}
                className="accent-[#1BBFB0]"
              />
              <KeyRound className="size-4 text-[#3A8FC4]" />
              {factor.friendly_name || 'Authenticator app'}
            </label>
          ))}
        </fieldset>
      )}

      {factorId && (
        <div className="rounded-xl bg-[#F7F9FC] p-4">
          <label
            htmlFor="mfa-challenge-code"
            className="block text-xs font-semibold tracking-[0.8px] text-[#8A9BB0] uppercase"
          >
            Authentication code
          </label>
          <InputOTP
            id="mfa-challenge-code"
            maxLength={6}
            value={code}
            onChange={(value) => {
              setCode(value.replace(/\D/g, '').slice(0, 6))
              setError('')
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            disabled={verifying}
            containerClassName="mt-3"
            aria-invalid={Boolean(error)}
          >
            <InputOTPGroup className="gap-2">
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className="size-11 rounded-[9px]! border border-[#E2E8F0]! bg-white text-base font-bold text-[#0D1F3C] data-[active=true]:border-[#1BBFB0]! data-[active=true]:ring-[#1BBFB0]/20"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
      )}

      {error && (
        <Alert className="border-[rgba(232,86,58,0.25)] bg-[#FDE8E3] text-[#C0392B]">
          <CircleAlert />
          <AlertDescription className="text-[#C0392B]">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={verifying}
            className="h-10 rounded-[9px] border-[#E2E8F0] bg-white px-5 text-[13.5px] font-semibold text-[#4A6380] hover:bg-[#F7F9FC]"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!factorId || code.length !== 6 || verifying}
          className="h-10 rounded-[9px] bg-[#1BBFB0] px-6 text-[13.5px] font-bold text-white hover:bg-[#16AFA1]"
        >
          {verifying && <LoaderCircle className="animate-spin" />}
          {verifying ? 'Verifying…' : 'Verify and continue'}
        </Button>
      </div>
    </form>
  )
}
