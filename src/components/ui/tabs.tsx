import React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../utils'

// shadcn/ui Tabs on Radix, restyled with the site's tokens. The selected tab carries a bottom bar in the primary
// text color, so it stands out at more than 3:1, not only by its background.

export const Tabs = TabsPrimitive.Root

export const TabsList = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        className={cn(
            'inline-flex flex-wrap items-center gap-1 rounded-md border border-primary bg-accent p-1',
            className
        )}
        {...props}
    />
))
TabsList.displayName = 'TabsList'

export const TabsTrigger = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
            'rounded border-b-2 border-transparent px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--text-primary))] data-[state=active]:border-[rgb(var(--text-primary))] data-[state=active]:bg-primary data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-sm',
            className
        )}
        {...props}
    />
))
TabsTrigger.displayName = 'TabsTrigger'

export const TabsContent = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Content ref={ref} className={cn('mt-5 focus-visible:outline-none', className)} {...props} />
))
TabsContent.displayName = 'TabsContent'
