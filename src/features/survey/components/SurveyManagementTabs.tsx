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
        variant="line"
        aria-label="Survey management"
        className="grid! h-auto w-full! grid-cols-2 gap-0 rounded-none border-b border-[#D9E2EC] bg-transparent p-0 md:grid-cols-4"
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
                'min-w-0 gap-2 rounded-none px-2 py-3.5 text-[12px] font-semibold text-[#8A9BB0] after:bottom-[-1px] after:bg-[#1BBFB0] hover:text-[#0D1F3C] data-active:text-[#0D1F3C] sm:text-[13px]',
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
