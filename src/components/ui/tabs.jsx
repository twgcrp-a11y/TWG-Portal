import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'
export const Tabs = TabsPrimitive.Root
export function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1', className)}
      {...props}
    />
  )
}
export function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-all text-gray-600 hover:text-gray-900 data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm',
        className
      )}
      {...props}
    />
  )
}
export function TabsContent({ className, ...props }) {
  return <TabsPrimitive.Content className={cn('mt-2', className)} {...props} />
}
