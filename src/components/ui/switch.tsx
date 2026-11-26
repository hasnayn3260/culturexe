import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from 'cn'

function Switch({
  className,
  ...props
}: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-[#CBD5E1] p-0.5 outline-none transition-colors',
        'data-checked:bg-[#1BBFB0] focus-visible:ring-3 focus-visible:ring-[#1BBFB0]/25',
        'data-disabled:cursor-not-allowed data-disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 translate-x-0 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-5"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
