import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  CircleCheck,
  CircleOff,
  LoaderCircle,
  Trash2,
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { ManagedOrganisation, OrganisationAction } from '../types'

type OrganisationActionDialogProps = {
  open: boolean
  action: OrganisationAction
  organisation: ManagedOrganisation | null
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (
    organisation: ManagedOrganisation,
    action: OrganisationAction,
  ) => Promise<unknown>
}

const content = {
  activate: {
    title: 'Activate this organisation?',
    description:
      'The organisation will return to active status and can be used for new users and surveys.',
    confirmLabel: 'Activate organisation',
    icon: CircleCheck,
    iconClassName: 'bg-[#E7F9F7] text-[#087C72]',
    buttonClassName: 'bg-[#1BBFB0] text-white hover:bg-[#16A99C]',
  },
  deactivate: {
    title: 'Deactivate this organisation?',
    description:
      'The organisation and its historical data will remain available, but it should not be used for new activity until reactivated.',
    confirmLabel: 'Deactivate organisation',
    icon: CircleOff,
    iconClassName: 'bg-[#FFF4E8] text-[#C87922]',
    buttonClassName: 'bg-[#C87922] text-white hover:bg-[#AD671C]',
  },
  delete: {
    title: 'Permanently delete this organisation?',
    description:
      'This removes the organisation record, logo and banner. Organisations with linked users or surveys cannot be deleted and must be deactivated instead.',
    confirmLabel: 'Delete permanently',
    icon: Trash2,
    iconClassName: 'bg-[#FFF0EE] text-[#D94A3A]',
    buttonClassName: 'bg-[#D94A3A] text-white hover:bg-[#C33D2F]',
  },
} satisfies Record<OrganisationAction, {
  title: string
  description: string
  confirmLabel: string
  icon: typeof Building2
  iconClassName: string
  buttonClassName: string
}>

export default function OrganisationActionDialog({
  open,
  action,
  organisation,
  pending = false,
  onOpenChange,
  onConfirm,
}: OrganisationActionDialogProps) {
  const [confirmation, setConfirmation] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const details = content[action]
  const Icon = details.icon
  const organisationLabel = organisation?.tradingName || organisation?.name || ''
  const canConfirm =
    Boolean(organisation) &&
    (action !== 'delete' || (
      confirmation.trim() === organisationLabel && acknowledged
    ))

  useEffect(() => {
    if (!open) return
    setConfirmation('')
    setAcknowledged(false)
    setError(null)
  }, [action, open, organisation?.id])

  async function confirmAction() {
    if (!organisation || !canConfirm) return
    setError(null)

    try {
      await onConfirm(organisation, action)
      onOpenChange(false)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The organisation could not be updated. Please try again.',
      )
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[18px] bg-white p-6 text-[#0D1F3C] shadow-[0_24px_64px_rgba(13,31,60,0.20)] ring-0 sm:max-w-[480px]">
        <AlertDialogHeader className="items-start text-left">
          <AlertDialogMedia className={`rounded-xl ${details.iconClassName}`}>
            <Icon />
          </AlertDialogMedia>
          <AlertDialogTitle className="font-['Plus_Jakarta_Sans'] text-lg font-extrabold text-[#0D1F3C]">
            {details.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left leading-6 text-[#6D7D90]">
            <span className="font-semibold text-[#314966]">
              {organisationLabel || 'This organisation'}
            </span>
            {' — '}
            {details.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {action === 'delete' && (
          <div className="space-y-4 rounded-xl border border-[#F1D1CC] bg-[#FFF8F7] p-4">
            <div>
              <Label
                htmlFor="delete-organisation-confirmation"
                className="mb-2 block leading-5 text-[#7A3B33]"
              >
                Enter <span className="font-bold">{organisationLabel}</span> to confirm
              </Label>
              <Input
                id="delete-organisation-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                disabled={pending}
                className="h-10 border-[#E8B9B2] bg-white text-[#0D1F3C] focus-visible:border-[#D94A3A] focus-visible:ring-[#D94A3A]/20"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-[#7A3B33]">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                disabled={pending}
                className="mt-0.5 size-4 shrink-0 accent-[#D94A3A]"
              />
              <span>
                I confirm that I understand this action permanently deletes the
                organisation and its branding and cannot be undone.
              </span>
            </label>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="border-[#F4B6AE] bg-[#FFF5F3]">
            <AlertTriangle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter className="-mx-6 -mb-6 mt-1 rounded-b-[18px] border-[#E8EDF3] bg-[#F8FAFC] px-6 py-4">
          <AlertDialogCancel
            disabled={pending}
            className="h-10 border-[#D6E0EB] bg-white px-5 text-[#526A88]"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            onClick={() => void confirmAction()}
            disabled={!canConfirm || pending}
            className={`h-10 px-5 font-bold ${details.buttonClassName}`}
          >
            {pending && <LoaderCircle className="animate-spin" />}
            {details.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
