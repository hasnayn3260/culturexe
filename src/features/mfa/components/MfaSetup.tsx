import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Check,
  CircleAlert,
  Clipboard,
  LoaderCircle,
  QrCode,
  ShieldCheck,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import {
  enrollTotpFactor,
  unenrollMfaFactor,
  verifyTotpFactor,
  type TotpEnrollment,
} from '@/features/mfa/services/mfa'

type MfaSetupProps = {
  onComplete: (factorId: string) => void | Promise<void>
  onCancel: () => void
  factorName?: string
}

export default function MfaSetup({
  onComplete,
  onCancel,
  factorName = 'CultureXe Authenticator',
}: MfaSetupProps) {
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const enrollmentStarted = useRef(false)

  const startEnrollment = useCallback(async () => {
    if (enrollmentStarted.current) return

    enrollmentStarted.current = true
    setLoading(true)
    setError('')

    try {
      const result = await enrollTotpFactor(factorName)
      setEnrollment(result)
    } catch (caughtError) {
      enrollmentStarted.current = false
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not start authenticator setup.',
      )
    } finally {
      setLoading(false)
    }
  }, [factorName])

  useEffect(() => {
    void startEnrollment()
  }, [startEnrollment])

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!enrollment || code.length !== 6) return

    setVerifying(true)
    setError('')

    try {
      await verifyTotpFactor(enrollment.factorId, code)
      await onComplete(enrollment.factorId)
    } catch (caughtError) {
      setCode('')
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The authenticator code could not be verified.',
      )
    } finally {
      setVerifying(false)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    setError('')

    try {
      if (enrollment) await unenrollMfaFactor(enrollment.factorId)
      onCancel()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not cancel authenticator setup.',
      )
    } finally {
      setCancelling(false)
    }
  }

  async function copySecret() {
    if (!enrollment) return

    try {
      await navigator.clipboard.writeText(enrollment.secret)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Could not copy the setup key. Select and copy it manually.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-[13px] text-[#8A9BB0]">
        <LoaderCircle className="size-4 animate-spin" />
        Preparing authenticator setup…
      </div>
    )
  }

  if (!enrollment) {
    return (
      <Alert className="border-[rgba(232,86,58,0.25)] bg-[#FDE8E3] text-[#C0392B]">
        <CircleAlert />
        <AlertDescription className="space-y-3 text-[#C0392B]">
          <p>{error || 'Could not start authenticator setup.'}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void startEnrollment()}
              className="bg-[#1BBFB0] text-white hover:bg-[#16AFA1]"
            >
              Try again
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancel}
              className="border-[rgba(232,86,58,0.25)] bg-white text-[#C0392B]"
            >
              Cancel
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleVerify} className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-[15px] font-bold text-[#0D1F3C]">
          <ShieldCheck className="size-5 text-[#1BBFB0]" />
          Set up an authenticator app
        </div>
        <p className="mt-1.5 text-[13px] leading-5 text-[#4A6380]">
          Scan the QR code with Microsoft Authenticator, Google Authenticator, 1Password, or another TOTP app.
        </p>
      </div>

      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="flex size-9 items-center justify-center rounded-[9px] bg-[#E0F7F5] text-[#0A7A72]">
          <QrCode className="size-4" />
        </div>
        <div className="mt-2 text-[13px] font-semibold text-[#0D1F3C]">
          Scan QR code
        </div>

        <div className="mt-3 rounded-[12px] bg-white p-3 ring-1 ring-[#E2E8F0]">
          <img
            src={enrollment.qrCode}
            alt="CultureXe authenticator setup QR code"
            className="size-44 sm:size-48"
          />
        </div>

        <div className="mt-5 w-full">
          <div className="text-[13px] font-semibold text-[#0D1F3C]">
            Can't scan the code?
          </div>
          <p className="mt-1 text-xs leading-5 text-[#8A9BB0]">
            Enter this setup key manually in your authenticator app. Keep it private.
          </p>
          <div className="mt-3 flex min-w-0 items-center gap-2 rounded-[9px] bg-[#F7F9FC] p-2.5 text-left ring-1 ring-[#E2E8F0]">
            <code className="min-w-0 flex-1 break-all font-mono text-xs font-semibold text-[#0D1F3C]">
              {enrollment.secret}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void copySecret()}
              aria-label="Copy authenticator setup key"
              className="shrink-0 text-[#4A6380] hover:bg-white"
            >
              {copied ? <Check className="text-[#1BBFB0]" /> : <Clipboard />}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md rounded-xl bg-[#F7F9FC] p-4">
        <label
          htmlFor="mfa-verification-code"
          className="block text-xs font-semibold tracking-[0.8px] text-[#8A9BB0] uppercase"
        >
          Verification code
        </label>
        <p className="mt-1 text-xs text-[#4A6380]">
          Enter the six-digit code currently shown in your authenticator app.
        </p>
        <InputOTP
          id="mfa-verification-code"
          maxLength={6}
          value={code}
          onChange={(value) => {
            setCode(value.replace(/\D/g, '').slice(0, 6))
            setError('')
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          disabled={verifying || cancelling}
          containerClassName="mt-3"
          aria-invalid={Boolean(error)}
        >
          <InputOTPGroup className="w-full gap-1.5 sm:gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="size-10 rounded-[9px]! border border-[#E2E8F0]! bg-white text-base font-bold text-[#0D1F3C] data-[active=true]:border-[#1BBFB0]! data-[active=true]:ring-[#1BBFB0]/20 sm:size-11"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      {error && (
        <Alert className="border-[rgba(232,86,58,0.25)] bg-[#FDE8E3] text-[#C0392B]">
          <CircleAlert />
          <AlertDescription className="text-[#C0392B]">{error}</AlertDescription>
        </Alert>
      )}

      <div className="mx-auto flex max-w-md flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleCancel()}
          disabled={verifying || cancelling}
          className="h-10 rounded-[9px] border-[#E2E8F0] bg-white px-5 text-[13.5px] font-semibold text-[#4A6380] hover:bg-[#F7F9FC]"
        >
          {cancelling ? 'Cancelling…' : 'Cancel'}
        </Button>
        <Button
          type="submit"
          disabled={code.length !== 6 || verifying || cancelling}
          className="h-10 rounded-[9px] bg-[#1BBFB0] px-6 text-[13.5px] font-bold text-white hover:bg-[#16AFA1]"
        >
          {verifying && <LoaderCircle className="animate-spin" />}
          {verifying ? 'Verifying…' : 'Verify and enable'}
        </Button>
      </div>
    </form>
  )
}
