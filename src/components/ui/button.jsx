import { cn } from '@/lib/utils'
export function Button({ className, variant = 'default', ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50',
        variant === 'default' && 'bg-red-700 text-white hover:bg-red-800',
        variant === 'outline' && 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        className
      )}
      {...props}
    />
  )
}
