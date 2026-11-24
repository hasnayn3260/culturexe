import { useState, type ReactNode } from 'react'
import {
  BarChart3,
  Blocks,
  Building2,
  ChevronUp,
  ChevronsUpDown,
  ClipboardList,
  FileStack,
  Files,
  LayoutDashboard,
  LogOut,
  Settings,
  SlidersHorizontal,
  UserRound,
  UsersRound,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import ProfileDetailsTab, {
  type ProfileDetails,
  type ProfileDetailsUpdate,
} from '@/features/profile/components/ProfileDetailsTab'
import ProfileDialog from '@/features/profile/components/ProfileDialog'
import SecurityTab from '@/features/profile/components/SecurityTab'
import { useAuth } from '@/hooks/useAuth'

export type ConsultantScreen =
  | 'dashboard'
  | 'survey'
  | 'survey-templates'
  | 'analytics'
  | 'organisations'
  | 'clients'
  | 'settings'

type ConsultantSidebarProps = {
  screen: ConsultantScreen
  onScreenChange: (screen: ConsultantScreen) => void
  logo: ReactNode
}

type ConsultantAuth = {
  profile: (ProfileDetails & { role?: string | null }) | null
  role: string | null
  updateProfile: (updates: ProfileDetailsUpdate) => Promise<unknown>
  signOut: () => Promise<void>
}

const NAVIGATION_GROUPS = [
  {
    key: 'consultant-dashboard',
    label: 'Consultant Dashboard',
    icon: Blocks,
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    key: 'survey-management',
    label: 'Survey Management',
    icon: Files,
    items: [
      { key: 'survey', label: 'Surveys', icon: ClipboardList },
      { key: 'survey-templates', label: 'Survey Templates', icon: FileStack },
      { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    key: 'configuration',
    label: 'Configuration',
    icon: SlidersHorizontal,
    items: [
      { key: 'organisations', label: 'Organisations', icon: Building2 },
      { key: 'clients', label: 'Clients', icon: UsersRound },
    ],
  },
] as const

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  super_admin: 'Super Admin',
  consultant: 'Consultant',
  client: 'Client',
  employee: 'Employee',
}

function getInitials(fullName?: string | null): string {
  if (!fullName) return '?'

  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function ConsultantSidebar({
  screen,
  onScreenChange,
  logo,
}: ConsultantSidebarProps) {
  const { isMobile, state } = useSidebar()
  const auth = useAuth() as unknown as ConsultantAuth
  const [profileOpen, setProfileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'consultant-dashboard': true,
    'survey-management': true,
    configuration: true,
  })

  const fullName = auth.profile?.full_name || 'CultureXe User'
  const email = auth.profile?.email || ''
  const roleLabel = auth.role ? ROLE_LABELS[auth.role] || auth.role : ''
  const isSuperAdmin = auth.role === 'superadmin' || auth.role === 'super_admin'
  const isCollapsed = state === 'collapsed' && !isMobile

  return (
    <>
      <Sidebar collapsible="icon" className="border-r-0">
        <SidebarHeader className="border-b border-white/10 p-0">
          <div
            className={`flex items-center ${
              isCollapsed
                ? 'h-16 justify-center px-0'
                : 'h-[108px] gap-3 px-5'
            }`}
          >
            <div className="shrink-0">{logo}</div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-[18px] leading-none font-extrabold tracking-[-0.3px] text-white">
                  Culture<span className="text-[#1BBFB0]">Xe</span>
                </div>
                <div className="mt-2 text-[9px] leading-[1.55] tracking-[2.5px] text-white/35 uppercase">
                  by Africa International Advisors
                </div>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className={isCollapsed ? 'gap-1 py-3' : 'gap-1 py-4'}>
          {NAVIGATION_GROUPS.filter(
            (group) => group.key !== 'configuration' || isSuperAdmin,
          ).map((group) => {
            const groupOpen = openGroups[group.key] !== false
            const GroupIcon = group.icon

            return (
              <SidebarGroup
                key={group.key}
                className={isCollapsed ? 'w-full! px-2 py-1' : 'w-full! px-2 py-1.5'}
              >
                {!isCollapsed && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenGroups((current) => ({
                        ...current,
                        [group.key]: !groupOpen,
                      }))
                    }}
                    aria-expanded={groupOpen}
                    className="flex h-9 w-full items-center gap-2 rounded-[8px] px-2 text-left text-[12.5px] font-semibold text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    <GroupIcon className="size-[17px] shrink-0 text-white/75" />
                    <span className="min-w-0 flex-1 truncate">{group.label}</span>
                    <ChevronUp
                      className={`size-4 shrink-0 text-white/60 transition-transform ${
                        groupOpen ? '' : 'rotate-180'
                      }`}
                    />
                  </button>
                )}

                <SidebarGroupContent
                  className={`${isCollapsed || groupOpen ? 'block' : 'hidden'} w-full!`}
                >
                  <div
                    className={
                      isCollapsed
                        ? 'm-0 border-0 p-0'
                        : 'mt-1 ml-[17px] border-l border-white/45 pl-3'
                    }
                  >
                    <SidebarMenu className="w-full! gap-1.5">
                      {group.items
                        .filter((item) =>
                          item.key !== 'survey-templates' || isSuperAdmin)
                        .map((item) => (
                          <SidebarMenuItem key={item.key} className="w-full!">
                            <SidebarMenuButton
                              type="button"
                              size="lg"
                              tooltip={item.label}
                              isActive={screen === item.key}
                              onClick={() => onScreenChange(item.key)}
                              className={`${
                                isCollapsed
                                  ? 'mx-auto size-10! justify-center p-0!'
                                  : 'h-10 w-full! px-3'
                              } rounded-[9px] text-[13.5px] font-medium text-white/65 hover:bg-white/[0.07] hover:text-white data-active:bg-[#16B8C1] data-active:font-semibold data-active:text-white [&_svg]:text-white/65 data-active:[&_svg]:text-white`}
                            >
                              <item.icon />
                              {!isCollapsed && <span>{item.label}</span>}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )
          })}
        </SidebarContent>

        <SidebarFooter
          className={`border-t border-white/10 ${isCollapsed ? 'p-2' : 'p-2.5'}`}
        >
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className={`${
                        isCollapsed
                          ? 'mx-auto size-10! min-h-10 justify-center p-0!'
                          : 'h-auto min-h-14 px-2.5 py-2'
                      } rounded-[10px] text-white hover:bg-white/[0.07] hover:text-white data-open:bg-white/[0.07] data-open:text-white`}
                    >
                      <Avatar size="lg" className="ring-0 after:border-white/10">
                        <AvatarFallback className="bg-gradient-to-br from-[#1BBFB0] to-[#3A8FC4] text-xs font-extrabold text-white">
                          {getInitials(fullName)}
                        </AvatarFallback>
                      </Avatar>
                      {!isCollapsed && (
                        <>
                          <div className="min-w-0 flex-1 text-left">
                            <div className="truncate text-[12.5px] font-semibold text-white">
                              {fullName}
                            </div>
                            <div className="mt-0.5 truncate text-[10.5px] text-white/40">
                              {roleLabel}
                            </div>
                          </div>
                          <ChevronsUpDown className="ml-auto text-white/40" />
                        </>
                      )}
                    </SidebarMenuButton>
                  }
                />

                <DropdownMenuContent
                  side={isMobile ? 'bottom' : 'right'}
                  align="end"
                  sideOffset={8}
                  className="w-64 rounded-xl bg-white p-1.5 text-[#0D1F3C] shadow-[0_12px_40px_rgba(13,31,60,0.18)] ring-[#E2E8F0]"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-2 py-2 font-normal">
                      <div className="flex items-center gap-2.5">
                        <Avatar size="lg" className="after:border-[#E2E8F0]">
                          <AvatarFallback className="bg-gradient-to-br from-[#1BBFB0] to-[#3A8FC4] text-xs font-extrabold text-white">
                            {getInitials(fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-[#0D1F3C]">
                            {fullName}
                          </div>
                          <div className="truncate text-[11px] text-[#8A9BB0]">{email}</div>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-[#E2E8F0]" />

                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => setProfileOpen(true)}
                      className="gap-2 rounded-lg px-2 py-2 text-[13px] focus:bg-[#F7F9FC] focus:text-[#0D1F3C]"
                    >
                      <UserRound className="text-[#4A6380]" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onScreenChange('settings')}
                      className="gap-2 rounded-lg px-2 py-2 text-[13px] focus:bg-[#F7F9FC] focus:text-[#0D1F3C]"
                    >
                      <Settings className="text-[#4A6380]" />
                      Settings
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-[#E2E8F0]" />

                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => void auth.signOut()}
                    className="gap-2 rounded-lg px-2 py-2 text-[13px]"
                  >
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        fullName={fullName}
        email={email}
        roleLabel={roleLabel}
        profileDetails={
          <ProfileDetailsTab
            profile={auth.profile}
            onSave={auth.updateProfile}
            onCancel={() => setProfileOpen(false)}
          />
        }
        security={<SecurityTab />}
      />
    </>
  )
}
