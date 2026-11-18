import type { ReactNode } from 'react'
import { ShieldCheck, UserRound } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

export type ProfileDialogTab = 'profile' | 'security'

type ProfileDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fullName: string
  email?: string | null
  roleLabel?: string | null
  profileDetails: ReactNode
  security: ReactNode
  defaultTab?: ProfileDialogTab
}

function getInitials(fullName: string): string {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return initials || '?'
}

export default function ProfileDialog({
  open,
  onOpenChange,
  fullName,
  email,
  roleLabel,
  profileDetails,
  security,
  defaultTab = 'profile',
}: ProfileDialogProps) {
  const identityDetails = [roleLabel, email].filter(Boolean).join(' · ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[18px] bg-white p-0 text-[#0D1F3C] shadow-[0_24px_64px_rgba(13,31,60,0.20)] ring-0 sm:max-w-[760px]">
        <DialogHeader className="gap-1 px-7 pt-7 pr-16">
          <DialogTitle className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold tracking-[-0.3px] text-[#0D1F3C]">
            My Profile
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#8A9BB0]">
            Manage your personal details and account security.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-7 flex items-center gap-4 rounded-xl bg-[#F7F9FC] px-[18px] py-4">
          <div className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1BBFB0] to-[#3A8FC4] text-[17px] font-extrabold text-white">
            {getInitials(fullName)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold text-[#0D1F3C]">
              {fullName || 'Your Name'}
            </div>
            {identityDetails && (
              <div className="mt-0.5 truncate text-xs text-[#8A9BB0]">
                {identityDetails}
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full gap-0">
          <TabsList
            variant="line"
            className="mx-7 grid! h-auto w-[calc(100%-3.5rem)]! grid-cols-2 gap-0 border-b border-[#E2E8F0] p-0"
          >
            <TabsTrigger
              value="profile"
              className="w-full gap-2 rounded-none px-4 py-3 text-[13px] font-semibold text-[#8A9BB0] after:bottom-[-1px] after:bg-[#1BBFB0] data-active:text-[#0D1F3C]"
            >
              <UserRound data-icon="inline-start" />
              Profile Details
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="w-full gap-2 rounded-none px-4 py-3 text-[13px] font-semibold text-[#8A9BB0] after:bottom-[-1px] after:bg-[#1BBFB0] data-active:text-[#0D1F3C]"
            >
              <ShieldCheck data-icon="inline-start" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="w-full px-7 py-6">
            {profileDetails}
          </TabsContent>
          <TabsContent value="security" className="w-full px-7 py-6">
            {security}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
