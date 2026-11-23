import { useEffect, useState, type FormEvent } from 'react'
import { Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'

import PasswordRequirements from '@/components/PasswordRequirements'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { getPasswordValidationError } from '@/lib/passwordPolicy'

const ROLE_REDIRECTS: Record<string, string> = {
  superadmin: '/app',
  consultant: '/app',
  client: '/client',
}

type TemporaryPasswordAuth = {
  user: { id: string } | null
  profile: { must_change_password?: boolean | null } | null
  role: string | null
  loading: boolean
  completeTemporaryPasswordChange: (password: string) => Promise<unknown>
  signOut: () => Promise<void>
}

export default function ChangeTemporaryPassword() {
  const navigate = useNavigate()
  const auth = useAuth() as unknown as TemporaryPasswordAuth
  const {
    user,
    profile,
    role,
    loading,
    completeTemporaryPasswordChange,
    signOut,
  } = auth
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user && profile && !profile.must_change_password) {
      navigate((role && ROLE_REDIRECTS[role]) || '/login', { replace: true })
    }
  }, [loading, navigate, profile, role, user])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const passwordError = getPasswordValidationError(password)
    if (passwordError) {
      setError(`Password must contain: ${passwordError.toLowerCase()}.`)
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await completeTemporaryPasswordChange(password)
      navigate((role && ROLE_REDIRECTS[role]) || '/login', { replace: true })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Your password could not be updated.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#EEF5F9]">
        <LoaderCircle className="size-7 animate-spin text-[#1BBFB0]" />
      </main>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EEF5F9] p-4 sm:p-6">
      <section className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-[0_24px_70px_rgba(13,31,60,0.14)] sm:p-8">
        <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-[#E4F8F6] text-[#0C8C81]">
          <KeyRound className="size-6" />
        </div>

        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-[-0.4px] text-[#0D1F3C]">
          Create your password
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#526A88]">
          Replace the temporary password before continuing to CultureXe.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-[#F4B6AE] bg-[#FFF5F3] px-4 py-3 text-sm text-[#C33D2F]">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-[#526A88]">
              New password
            </label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                autoComplete="new-password"
                className="h-11 pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#8A9BB0] hover:bg-[#F1F5F9]"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
              <PasswordRequirements
                password={password}
                visible={passwordFocused || Boolean(password)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-[#526A88]">
              Confirm new password
            </label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmation ? 'text' : 'password'}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                className="h-11 pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmation((current) => !current)}
                aria-label={showConfirmation ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#8A9BB0] hover:bg-[#F1F5F9]"
              >
                {showConfirmation ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full bg-[#1BBFB0] font-bold text-white hover:bg-[#16A99C]"
          >
            {submitting && <LoaderCircle className="animate-spin" />}
            Save password and continue
          </Button>

          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full text-center text-sm font-semibold text-[#70839A] hover:text-[#0D1F3C]"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  )
}
