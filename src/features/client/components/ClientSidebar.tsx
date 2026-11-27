import ConsultantSidebar, {
  type ConsultantScreen,
} from '@/features/navigation/components/ConsultantSidebar'
import CultureXeMark from '@/features/navigation/components/CultureXeMark'

export type ClientScreen = 'home' | 'profile'

type ClientSidebarProps = {
  screen: ClientScreen
  onScreenChange: (screen: ClientScreen) => void
}

export default function ClientSidebar({ screen, onScreenChange }: ClientSidebarProps) {
  return (
    <ConsultantSidebar
      variant="client"
      screen={screen}
      onScreenChange={(nextScreen: ConsultantScreen) => {
        if (nextScreen === 'home' || nextScreen === 'profile') onScreenChange(nextScreen)
      }}
      logo={<span className="fluid-breathe"><CultureXeMark size={38} id="client-sidebar-logo" /></span>}
    />
  )
}
