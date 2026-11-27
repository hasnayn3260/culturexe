import { UserRound } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

import ProfileDetailsTab, {
  type ManagerOption,
  type ProfileDetails,
  type ProfileDetailsUpdate,
} from '../components/ProfileDetailsTab'

type ProfilePageProps = {
  organisationName?: string | null
  managerOptions?: ManagerOption[]
}

type ProfileAuth = {
  profile: ProfileDetails | null
  role: string | null
  updateProfile: (updates: ProfileDetailsUpdate) => Promise<unknown>
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  super_admin: 'Super Admin',
  consultant: 'Consultant',
  client: 'Client',
  employee: 'Employee',
}

function getInitials(fullName?: string | null): string {
  return fullName
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'
}

export default function ProfilePage({
  organisationName,
  managerOptions = [],
}: ProfilePageProps) {
  const auth = useAuth() as unknown as ProfileAuth
  const fullName = auth.profile?.full_name || 'CultureXe User'
  const roleLabel = auth.role ? ROLE_LABELS[auth.role] || auth.role : 'User'

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[linear-gradient(135deg,#B9DEE7_0%,#CDEBE5_48%,#A9D3DF_100%)] px-8 py-7">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/60 text-[#087C72]">
            <UserRound className="size-5" />
          </div>
          <div>
            <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#0D1F3C]">
              My Profile
            </h1>
            <p className="mt-1 text-sm text-[#405B78]">
              Keep your personal and employment details accurate.
            </p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#DFE6EE] bg-white shadow-[0_8px_24px_rgba(13,31,60,0.04)]">
        <div className="flex items-center gap-4 border-b border-[#E8EDF3] px-6 py-5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1BBFB0] to-[#3A8FC4] text-lg font-extrabold text-white">
            {getInitials(fullName)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold text-[#0D1F3C]">{fullName}</div>
            <div className="mt-0.5 truncate text-sm text-[#8A9BB0]">
              {[roleLabel, auth.profile?.email].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <ProfileDetailsTab
            profile={auth.profile}
            organisationName={organisationName}
            managerOptions={managerOptions}
            onSave={auth.updateProfile}
          />
        </div>
      </section>
    </div>
  )
}
