import {
  ClipboardList,
  ListFilter,
  Settings2,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { cn } from 'cn'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  SURVEY_MANAGEMENT_TABS,
  type SurveyManagementTab,
} from '../types'

type SurveyManagementTabsProps = {
  activeTab: SurveyManagementTab
  hasSelection: boolean
  onTabChange: (tab: SurveyManagementTab) => boolean | void
  className?: string
}

const TAB_ICONS: Record<SurveyManagementTab, LucideIcon> = {
  list: ListFilter,
  builder: ClipboardList,
  controls: SlidersHorizontal,
  settings: Settings2,
}

function isSurveyManagementTab(value: unknown): value is SurveyManagementTab {
  return SURVEY_MANAGEMENT_TABS.some(({ id }) => id === value)
}

export default function SurveyManagementTabs({
  activeTab,
  hasSelection,
  onTabChange,
  className,
}: SurveyManagementTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (isSurveyManagementTab(value)) onTabChange(value)
      }}
      className={cn('w-full gap-0', className)}
    >
      <TabsList
        aria-label="Survey management"
        className="grid! h-auto! min-h-14 w-full! grid-cols-2 gap-1.5 overflow-hidden rounded-xl border border-[#DFE6EE] bg-[#F4F7FA] p-1.5 md:grid-cols-4"
      >
        {SURVEY_MANAGEMENT_TABS.map(({ id, label, requiresSurvey }) => {
          const Icon = TAB_ICONS[id]
          const disabled = requiresSurvey && !hasSelection

          return (
            <TabsTrigger
              key={id}
              value={id}
              disabled={disabled}
              title={
                disabled
                  ? 'Select a survey from the Survey List first.'
                  : label
              }
              className={cn(
                'h-full! min-h-10 min-w-0 gap-2 self-stretch rounded-lg border-0 px-2 py-2 text-[12px] font-semibold text-[#7C8EA5] shadow-none after:hidden hover:bg-white/70 hover:text-[#0D1F3C] data-active:bg-white data-active:text-[#0D1F3C] data-active:shadow-[0_2px_8px_rgba(13,31,60,0.08)] sm:text-[13px]',
                'disabled:cursor-not-allowed disabled:opacity-45',
              )}
            >
              <Icon className="size-4 shrink-0" data-icon="inline-start" />
              <span className="min-w-0 truncate">{label}</span>
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
