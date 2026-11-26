import { Check, Circle } from 'lucide-react'

import { getPasswordRequirementStatuses } from '@/lib/passwordPolicy'

type PasswordRequirementsProps = {
  password: string
  visible: boolean
}

export default function PasswordRequirements({
  password,
  visible,
}: PasswordRequirementsProps) {
  const requirements = getPasswordRequirementStatuses(password)
  const allRequirementsMet = requirements.every((requirement) => requirement.met)

  if (!visible || allRequirementsMet) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute top-[calc(100%+8px)] right-0 left-0 z-50 rounded-xl border border-[#D8E2EC] bg-white p-3.5 text-left shadow-[0_12px_32px_rgba(13,31,60,0.16)]"
    >
      <div className="mb-2 text-xs font-semibold text-[#0D1F3C]">
        Your password must include:
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {requirements.map((requirement) => (
          <div
            key={requirement.label}
            className={`flex items-center gap-2 text-[11.5px] ${
              requirement.met ? 'text-[#0A7A72]' : 'text-[#8A9BB0]'
            }`}
          >
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
                requirement.met ? 'bg-[#E0F7F5]' : 'bg-[#F1F5F9]'
              }`}
            >
              {requirement.met ? (
                <Check className="size-2.5" strokeWidth={3} />
              ) : (
                <Circle className="size-2 fill-current opacity-40" />
              )}
            </span>
            {requirement.label}
          </div>
        ))}
      </div>
    </div>
  )
}
