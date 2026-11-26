import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  AlertCircle,
  Building2,
  ImagePlus,
  LoaderCircle,
  Upload,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  ORGANISATION_SECTORS,
  ORGANISATION_TYPES,
  type ManagedOrganisation,
  type OrganisationFormValues,
} from '../types'
import {
  validateOrganisationForm,
  type OrganisationFormErrors,
  type OrganisationFormField,
} from '../validation'

type OrganisationFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  organisation?: ManagedOrganisation | null
  submitting?: boolean
  onSubmit: (values: OrganisationFormValues) => Promise<unknown>
}

const EMPTY_VALUES: OrganisationFormValues = {
  name: '',
  tradingName: '',
  registrationNumber: '',
  organisationType: '',
  sector: '',
  employeeCount: '',
  website: '',
  yearEstablished: '',
  logo: null,
  banner: null,
  countryOfRegistration: 'South Africa',
  registeredAddress: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'South Africa',
  generalEmail: '',
  mainPhone: '',
  emailDomain: '',
  contactFirstName: '',
  contactSurname: '',
  contactJobTitle: '',
  contactEmail: '',
  contactPhone: '',
  contactDepartment: '',
  timezone: 'Africa/Johannesburg',
  preferredLocale: 'en-ZA',
  externalReference: '',
  status: 'onboarding',
}

const inputClassName =
  'h-10 rounded-[10px] border-[#DCE4EE] bg-white px-3 text-[14px] text-[#0D1F3C] placeholder:text-[#9AA9BC] focus-visible:border-[#1BBFB0] focus-visible:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-[#D94A3A]/15'

const selectClassName =
  'h-10 w-full rounded-[10px] border border-[#DCE4EE] bg-white px-3 text-[14px] text-[#0D1F3C] outline-none transition focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20 aria-invalid:border-[#D94A3A] aria-invalid:ring-3 aria-invalid:ring-[#D94A3A]/15 disabled:cursor-not-allowed disabled:bg-[#F3F6FA] disabled:text-[#8A9BB0]'

function valuesFromOrganisation(
  organisation?: ManagedOrganisation | null,
): OrganisationFormValues {
  if (!organisation) return { ...EMPTY_VALUES }

  return {
    name: organisation.name,
    tradingName: organisation.tradingName || '',
    registrationNumber: organisation.registrationNumber || '',
    organisationType: organisation.organisationType || '',
    sector: organisation.sector || '',
    employeeCount: organisation.employeeCount?.toString() || '',
    website: organisation.website || '',
    yearEstablished: organisation.yearEstablished?.toString() || '',
    logo: null,
    banner: null,
    countryOfRegistration: organisation.countryOfRegistration || '',
    registeredAddress: organisation.registeredAddress || '',
    city: organisation.city || '',
    province: organisation.province || '',
    postalCode: organisation.postalCode || '',
    country: organisation.country || '',
    generalEmail: organisation.generalEmail || '',
    mainPhone: organisation.mainPhone || '',
    emailDomain: organisation.emailDomain || '',
    contactFirstName: organisation.contactFirstName || '',
    contactSurname: organisation.contactSurname || '',
    contactJobTitle: organisation.contactJobTitle || '',
    contactEmail: organisation.contactEmail || '',
    contactPhone: organisation.contactPhone || '',
    contactDepartment: organisation.contactDepartment || '',
    timezone: organisation.timezone,
    preferredLocale: organisation.preferredLocale,
    externalReference: organisation.externalReference || '',
    status: organisation.status,
  }
}

function useImagePreview(file: File | null, existingUrl: string | null) {
  const [preview, setPreview] = useState<string | null>(existingUrl)

  useEffect(() => {
    if (!file) {
      setPreview(existingUrl)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [existingUrl, file])

  return preview
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs font-medium text-[#D94A3A]">{message}</p>
}

function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor: string
  children: string
  required?: boolean
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-2 text-[#526A88]">
      {children}
      {required && (
        <span className="font-extrabold text-[#D94A3A]" aria-hidden="true">*</span>
      )}
      {required && <span className="sr-only"> (required)</span>}
    </Label>
  )
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="sm:col-span-2">
      <div className="mb-4 border-b border-[#E8EDF3] pb-3">
        <h3 className="font-['Plus_Jakarta_Sans'] text-[15px] font-extrabold text-[#0D1F3C]">
          {title}
        </h3>
        <p className="mt-1 text-xs text-[#8A9BB0]">{description}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function ImageField({
  id,
  label,
  helpText,
  preview,
  error,
  disabled,
  required,
  wide = false,
  onChange,
}: {
  id: string
  label: string
  helpText: string
  preview: string | null
  error?: string
  disabled: boolean
  required: boolean
  wide?: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      <label
        htmlFor={id}
        className={`group flex cursor-pointer items-center gap-4 rounded-[12px] border border-dashed p-3 transition ${
          error
            ? 'border-[#D94A3A] bg-[#FFF8F6]'
            : 'border-[#C8D5E3] bg-[#F8FAFC] hover:border-[#1BBFB0] hover:bg-[#F1FBFA]'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className={`${wide ? 'h-20 w-40' : 'size-20'} shrink-0 overflow-hidden rounded-[10px] border border-[#E0E7EF] bg-white`}>
          {preview ? (
            <img
              src={preview}
              alt={`${label} preview`}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#8A9BB0]">
              <ImagePlus className="size-6" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <span className="flex items-center gap-2 text-sm font-bold text-[#0D1F3C]">
            <Upload className="size-4 text-[#0C8C81]" />
            {preview ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          </span>
          <span className="mt-1 block text-xs leading-5 text-[#8A9BB0]">
            {helpText}
          </span>
        </div>
      </label>
      <Input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onChange}
        className="sr-only"
        disabled={disabled}
      />
      <FieldError message={error} />
    </div>
  )
}

export default function OrganisationFormDialog({
  open,
  onOpenChange,
  mode,
  organisation,
  submitting = false,
  onSubmit,
}: OrganisationFormDialogProps) {
  const [values, setValues] = useState<OrganisationFormValues>(() =>
    valuesFromOrganisation(mode === 'edit' ? organisation : null),
  )
  const [errors, setErrors] = useState<OrganisationFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues(valuesFromOrganisation(mode === 'edit' ? organisation : null))
    setErrors({})
    setSubmitError(null)
  }, [mode, open, organisation])

  const logoPreview = useImagePreview(values.logo, organisation?.logoUrl || null)
  const bannerPreview = useImagePreview(
    values.banner,
    organisation?.bannerUrl || null,
  )

  function setField<Field extends OrganisationFormField>(
    field: Field,
    value: OrganisationFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    setSubmitError(null)
  }

  function setImage(
    field: 'logo' | 'banner',
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setField(field, event.target.files?.[0] || null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateOrganisationForm(values, {
      existingLogoPath: organisation?.logoPath,
      existingBannerPath: organisation?.bannerPath,
    })

    if (!result.success) {
      setErrors(result.errors)
      const firstInvalidField = Object.keys(result.errors)[0]
      if (firstInvalidField) {
        document.getElementById(`organisation-${firstInvalidField}`)?.focus()
      }
      return
    }

    setErrors({})
    setSubmitError(null)

    try {
      await onSubmit(result.data)
      onOpenChange(false)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'The organisation could not be saved. Please try again.',
      )
    }
  }

  const isEdit = mode === 'edit'
  const title = isEdit ? 'Edit organisation' : 'Add new organisation'
  const description = isEdit
    ? 'Update the organisation, primary contact and branding details.'
    : 'Create the organisation before assigning users and surveys.'

  return (
    <Dialog open={open} onOpenChange={submitting ? undefined : onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto rounded-[18px] bg-white p-0 text-[#0D1F3C] shadow-[0_24px_64px_rgba(13,31,60,0.20)] ring-0 sm:max-w-[900px]">
        <DialogHeader className="border-b border-[#E8EDF3] px-7 py-6 pr-16">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E4F8F6] text-[#0C8C81]">
              <Building2 />
            </div>
            <div>
              <DialogTitle className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold tracking-[-0.3px] text-[#0D1F3C]">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] text-[#8A9BB0]">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-7 px-7 py-6 sm:grid-cols-2">
            <p className="text-xs font-medium text-[#7A3B33] sm:col-span-2">
              <span className="font-extrabold text-[#D94A3A]">*</span>
              {' '}Required field
            </p>

            {submitError && (
              <Alert
                variant="destructive"
                className="border-[#F4B6AE] bg-[#FFF5F3] sm:col-span-2"
              >
                <AlertCircle />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <FormSection
              title="Organisation details"
              description="Legal identity, classification and workforce information."
            >
              <div>
                <FieldLabel htmlFor="organisation-name" required>
                  Organisation name
                </FieldLabel>
                <Input
                  id="organisation-name"
                  value={values.name}
                  onChange={(event) => setField('name', event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  className={inputClassName}
                  placeholder="Registered organisation name"
                  disabled={submitting}
                />
                <FieldError message={errors.name} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-tradingName" required>
                  Trading name
                </FieldLabel>
                <Input
                  id="organisation-tradingName"
                  value={values.tradingName}
                  onChange={(event) => setField('tradingName', event.target.value)}
                  aria-invalid={Boolean(errors.tradingName)}
                  className={inputClassName}
                  placeholder="Name used publicly"
                  disabled={submitting}
                />
                <FieldError message={errors.tradingName} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-registrationNumber" required>
                  Registration number
                </FieldLabel>
                <Input
                  id="organisation-registrationNumber"
                  value={values.registrationNumber}
                  onChange={(event) => setField('registrationNumber', event.target.value)}
                  aria-invalid={Boolean(errors.registrationNumber)}
                  className={inputClassName}
                  placeholder="e.g. 2026/123456/07"
                  disabled={submitting}
                />
                <FieldError message={errors.registrationNumber} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-organisationType" required>
                  Organisation type
                </FieldLabel>
                <select
                  id="organisation-organisationType"
                  value={values.organisationType}
                  onChange={(event) => setField(
                    'organisationType',
                    event.target.value as OrganisationFormValues['organisationType'],
                  )}
                  aria-invalid={Boolean(errors.organisationType)}
                  className={selectClassName}
                  disabled={submitting}
                >
                  <option value="">Select organisation type</option>
                  {ORGANISATION_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <FieldError message={errors.organisationType} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-sector" required>Sector</FieldLabel>
                <select
                  id="organisation-sector"
                  value={values.sector}
                  onChange={(event) => setField(
                    'sector',
                    event.target.value as OrganisationFormValues['sector'],
                  )}
                  aria-invalid={Boolean(errors.sector)}
                  className={selectClassName}
                  disabled={submitting}
                >
                  <option value="">Select sector</option>
                  {ORGANISATION_SECTORS.map((sector) => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
                <FieldError message={errors.sector} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-employeeCount" required>
                  Total employee headcount
                </FieldLabel>
                <Input
                  id="organisation-employeeCount"
                  type="number"
                  min="1"
                  step="1"
                  value={values.employeeCount}
                  onChange={(event) => setField('employeeCount', event.target.value)}
                  aria-invalid={Boolean(errors.employeeCount)}
                  className={inputClassName}
                  placeholder="e.g. 350"
                  disabled={submitting}
                />
                <FieldError message={errors.employeeCount} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-website">Website</FieldLabel>
                <Input
                  id="organisation-website"
                  type="url"
                  value={values.website}
                  onChange={(event) => setField('website', event.target.value)}
                  aria-invalid={Boolean(errors.website)}
                  className={inputClassName}
                  placeholder="https://company.com"
                  disabled={submitting}
                />
                <FieldError message={errors.website} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-yearEstablished">
                  Year established
                </FieldLabel>
                <Input
                  id="organisation-yearEstablished"
                  type="number"
                  min="1700"
                  max={new Date().getFullYear()}
                  value={values.yearEstablished}
                  onChange={(event) => setField('yearEstablished', event.target.value)}
                  aria-invalid={Boolean(errors.yearEstablished)}
                  className={inputClassName}
                  placeholder="e.g. 1995"
                  disabled={submitting}
                />
                <FieldError message={errors.yearEstablished} />
              </div>
            </FormSection>

            <FormSection
              title="Organisation branding"
              description="Used in invitations, survey emails and the client experience."
            >
              <ImageField
                id="organisation-logo"
                label="Organisation logo"
                helpText="PNG, JPEG or WebP. Maximum 5 MB."
                preview={logoPreview}
                error={errors.logo}
                disabled={submitting}
                required
                onChange={(event) => setImage('logo', event)}
              />
              <ImageField
                id="organisation-banner"
                label="Organisation banner"
                helpText="Landscape PNG, JPEG or WebP. Maximum 5 MB."
                preview={bannerPreview}
                error={errors.banner}
                disabled={submitting}
                required
                wide
                onChange={(event) => setImage('banner', event)}
              />
            </FormSection>

            <FormSection
              title="Registration and address"
              description="Registered location and primary operating address."
            >
              <div>
                <FieldLabel htmlFor="organisation-countryOfRegistration" required>
                  Country of registration
                </FieldLabel>
                <Input
                  id="organisation-countryOfRegistration"
                  value={values.countryOfRegistration}
                  onChange={(event) => setField('countryOfRegistration', event.target.value)}
                  aria-invalid={Boolean(errors.countryOfRegistration)}
                  className={inputClassName}
                  disabled={submitting}
                />
                <FieldError message={errors.countryOfRegistration} />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel htmlFor="organisation-registeredAddress" required>
                  Registered address
                </FieldLabel>
                <Input
                  id="organisation-registeredAddress"
                  value={values.registeredAddress}
                  onChange={(event) => setField('registeredAddress', event.target.value)}
                  aria-invalid={Boolean(errors.registeredAddress)}
                  className={inputClassName}
                  placeholder="Street address"
                  disabled={submitting}
                />
                <FieldError message={errors.registeredAddress} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-city" required>City / town</FieldLabel>
                <Input
                  id="organisation-city"
                  value={values.city}
                  onChange={(event) => setField('city', event.target.value)}
                  aria-invalid={Boolean(errors.city)}
                  className={inputClassName}
                  disabled={submitting}
                />
                <FieldError message={errors.city} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-province" required>
                  Province / state
                </FieldLabel>
                <Input
                  id="organisation-province"
                  value={values.province}
                  onChange={(event) => setField('province', event.target.value)}
                  aria-invalid={Boolean(errors.province)}
                  className={inputClassName}
                  disabled={submitting}
                />
                <FieldError message={errors.province} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-postalCode" required>
                  Postal code
                </FieldLabel>
                <Input
                  id="organisation-postalCode"
                  value={values.postalCode}
                  onChange={(event) => setField('postalCode', event.target.value)}
                  aria-invalid={Boolean(errors.postalCode)}
                  className={inputClassName}
                  disabled={submitting}
                />
                <FieldError message={errors.postalCode} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-country" required>Country</FieldLabel>
                <Input
                  id="organisation-country"
                  value={values.country}
                  onChange={(event) => setField('country', event.target.value)}
                  aria-invalid={Boolean(errors.country)}
                  className={inputClassName}
                  disabled={submitting}
                />
                <FieldError message={errors.country} />
              </div>
            </FormSection>

            <FormSection
              title="General contact details"
              description="Public organisation contact information."
            >
              <div>
                <FieldLabel htmlFor="organisation-generalEmail" required>
                  General email address
                </FieldLabel>
                <Input
                  id="organisation-generalEmail"
                  type="email"
                  value={values.generalEmail}
                  onChange={(event) => setField('generalEmail', event.target.value)}
                  aria-invalid={Boolean(errors.generalEmail)}
                  className={inputClassName}
                  placeholder="info@company.com"
                  disabled={submitting}
                />
                <FieldError message={errors.generalEmail} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-mainPhone" required>
                  Main telephone number
                </FieldLabel>
                <Input
                  id="organisation-mainPhone"
                  type="tel"
                  value={values.mainPhone}
                  onChange={(event) => setField('mainPhone', event.target.value)}
                  aria-invalid={Boolean(errors.mainPhone)}
                  className={inputClassName}
                  placeholder="+27 00 000 0000"
                  disabled={submitting}
                />
                <FieldError message={errors.mainPhone} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-emailDomain" required>
                  Email domain
                </FieldLabel>
                <Input
                  id="organisation-emailDomain"
                  value={values.emailDomain}
                  onChange={(event) => setField('emailDomain', event.target.value)}
                  aria-invalid={Boolean(errors.emailDomain)}
                  className={inputClassName}
                  placeholder="company.com"
                  required
                  disabled={submitting}
                />
                <FieldError message={errors.emailDomain} />
                {!errors.emailDomain && (
                  <p className="mt-1 text-xs text-[#8A9BB0]">
                    CSV user email addresses must match this domain.
                  </p>
                )}
              </div>
            </FormSection>

            <FormSection
              title="Primary account contact"
              description="The main person responsible for this CultureXe account."
            >
              <div>
                <FieldLabel htmlFor="organisation-contactFirstName" required>
                  First name
                </FieldLabel>
                <Input
                  id="organisation-contactFirstName"
                  value={values.contactFirstName}
                  onChange={(event) => setField('contactFirstName', event.target.value)}
                  aria-invalid={Boolean(errors.contactFirstName)}
                  className={inputClassName}
                  disabled={submitting}
                />
                <FieldError message={errors.contactFirstName} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-contactSurname" required>
                  Surname
                </FieldLabel>
                <Input
                  id="organisation-contactSurname"
                  value={values.contactSurname}
                  onChange={(event) => setField('contactSurname', event.target.value)}
                  aria-invalid={Boolean(errors.contactSurname)}
                  className={inputClassName}
                  disabled={submitting}
                />
                <FieldError message={errors.contactSurname} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-contactJobTitle" required>
                  Job title
                </FieldLabel>
                <Input
                  id="organisation-contactJobTitle"
                  value={values.contactJobTitle}
                  onChange={(event) => setField('contactJobTitle', event.target.value)}
                  aria-invalid={Boolean(errors.contactJobTitle)}
                  className={inputClassName}
                  disabled={submitting}
                />
                <FieldError message={errors.contactJobTitle} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-contactDepartment" required>
                  Department
                </FieldLabel>
                <Input
                  id="organisation-contactDepartment"
                  value={values.contactDepartment}
                  onChange={(event) => setField('contactDepartment', event.target.value)}
                  aria-invalid={Boolean(errors.contactDepartment)}
                  className={inputClassName}
                  disabled={submitting}
                />
                <FieldError message={errors.contactDepartment} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-contactEmail" required>
                  Email address
                </FieldLabel>
                <Input
                  id="organisation-contactEmail"
                  type="email"
                  value={values.contactEmail}
                  onChange={(event) => setField('contactEmail', event.target.value)}
                  aria-invalid={Boolean(errors.contactEmail)}
                  className={inputClassName}
                  disabled={submitting}
                />
                <FieldError message={errors.contactEmail} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-contactPhone" required>
                  Contact number
                </FieldLabel>
                <Input
                  id="organisation-contactPhone"
                  type="tel"
                  value={values.contactPhone}
                  onChange={(event) => setField('contactPhone', event.target.value)}
                  aria-invalid={Boolean(errors.contactPhone)}
                  className={inputClassName}
                  disabled={submitting}
                />
                <FieldError message={errors.contactPhone} />
              </div>
            </FormSection>

            <FormSection
              title="Platform configuration"
              description="Regional preferences, internal reference and account state."
            >
              <div>
                <FieldLabel htmlFor="organisation-timezone" required>Timezone</FieldLabel>
                <Input
                  id="organisation-timezone"
                  value={values.timezone}
                  onChange={(event) => setField('timezone', event.target.value)}
                  aria-invalid={Boolean(errors.timezone)}
                  className={inputClassName}
                  disabled={submitting}
                />
                <FieldError message={errors.timezone} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-preferredLocale" required>
                  Preferred locale
                </FieldLabel>
                <Input
                  id="organisation-preferredLocale"
                  value={values.preferredLocale}
                  onChange={(event) => setField('preferredLocale', event.target.value)}
                  aria-invalid={Boolean(errors.preferredLocale)}
                  className={inputClassName}
                  placeholder="en-ZA"
                  disabled={submitting}
                />
                <FieldError message={errors.preferredLocale} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-externalReference">
                  External reference
                </FieldLabel>
                <Input
                  id="organisation-externalReference"
                  value={values.externalReference}
                  onChange={(event) => setField('externalReference', event.target.value)}
                  aria-invalid={Boolean(errors.externalReference)}
                  className={inputClassName}
                  placeholder="Optional CRM or account reference"
                  disabled={submitting}
                />
                <FieldError message={errors.externalReference} />
              </div>

              <div>
                <FieldLabel htmlFor="organisation-status" required>Status</FieldLabel>
                <select
                  id="organisation-status"
                  value={values.status}
                  onChange={(event) => setField(
                    'status',
                    event.target.value as OrganisationFormValues['status'],
                  )}
                  className={selectClassName}
                  disabled={submitting}
                >
                  <option value="onboarding">Onboarding</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </FormSection>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-[#E8EDF3] bg-white/95 px-7 py-4 backdrop-blur">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-[10px] border-[#D7E0EA] text-[#526A88]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-[10px] bg-[#1BBFB0] font-bold text-white hover:bg-[#14A99C]"
            >
              {submitting && <LoaderCircle className="animate-spin" />}
              {isEdit ? 'Save changes' : 'Create organisation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
