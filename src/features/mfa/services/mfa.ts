import type { AuthenticatorAssuranceLevels, Factor } from '@supabase/supabase-js'
import supabase from '../../../lib/supabaseClient'

export type MfaAssuranceState = {
  currentLevel: AuthenticatorAssuranceLevels | null
  nextLevel: AuthenticatorAssuranceLevels | null
  requiresChallenge: boolean
}

export type TotpEnrollment = {
  factorId: string
  friendlyName?: string
  qrCode: string
  secret: string
  uri: string
}

const DEFAULT_FACTOR_NAME = 'CultureXe Authenticator'

function normalizeTotpCode(code: string): string {
  const normalized = code.replace(/\s/g, '')

  if (!/^\d{6}$/.test(normalized)) {
    throw new Error('Enter the six-digit code from your authenticator app.')
  }

  return normalized
}

function toQrCodeDataUrl(qrCode: string): string {
  if (qrCode.startsWith('data:')) return qrCode
  return `data:image/svg+xml;utf-8,${encodeURIComponent(qrCode)}`
}

export async function getMfaAssuranceState(): Promise<MfaAssuranceState> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (error) throw error

  return {
    currentLevel: data.currentLevel,
    nextLevel: data.nextLevel,
    requiresChallenge: data.currentLevel === 'aal1' && data.nextLevel === 'aal2',
  }
}

export async function listVerifiedTotpFactors(): Promise<Factor<'totp', 'verified'>[]> {
  const { data, error } = await supabase.auth.mfa.listFactors()

  if (error) throw error
  return data.totp
}

export async function enrollTotpFactor(
  friendlyName = DEFAULT_FACTOR_NAME,
): Promise<TotpEnrollment> {
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()

  if (listError) throw listError

  const staleTotpFactors = factors.all.filter(
    (factor) => factor.factor_type === 'totp' && factor.status === 'unverified',
  )

  for (const factor of staleTotpFactors) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: factor.id,
    })

    if (unenrollError) throw unenrollError
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
    issuer: 'CultureXe',
  })

  if (error) throw error

  return {
    factorId: data.id,
    friendlyName: data.friendly_name,
    qrCode: toQrCodeDataUrl(data.totp.qr_code),
    secret: data.totp.secret,
    uri: data.totp.uri,
  }
}

export async function verifyTotpFactor(factorId: string, code: string): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: normalizeTotpCode(code),
  })

  if (error) throw error
}

export async function unenrollMfaFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })

  if (error) throw error
}
