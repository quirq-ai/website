import React from 'react'
import { cn } from '../../utils'

// shadcn/ui Badge, restyled with the site's tokens. Status variants keep the label in the primary
// text color and carry the status color on a dot, so the text meets 4.5:1 in both themes.

const variants = {
    default: 'border-primary bg-accent',
    outline: 'border-primary bg-transparent',
    good: 'border-primary bg-accent [--dot:#2f7d32] dark:[--dot:#6fcf73]',
    warn: 'border-primary bg-accent [--dot:#a15c00] dark:[--dot:#f2b84b]',
    bad: 'border-primary bg-accent [--dot:#c62828] dark:[--dot:#ff7a6b]',
    muted: 'border-primary bg-transparent [--dot:#6b6d66] dark:[--dot:#a3a59c]',
} as const

export type BadgeVariant = keyof typeof variants

export function Badge({
    variant = 'default',
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }): JSX.Element {
    const dot = variant === 'good' || variant === 'warn' || variant === 'bad' || variant === 'muted'
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium text-primary',
                variants[variant],
                className
            )}
            {...props}
        >
            {dot && <span aria-hidden className="size-2 shrink-0 rounded-full bg-[var(--dot)]" />}
            {children}
        </span>
    )
}
