import React from 'react'
import { Link } from 'gatsby'
import { cn } from '../../utils'

// shadcn/ui Button (new-york-v4 registry, shadcn-ui/ui@6efecd8), restyled with the site's tokens. Variants are a
// plain class map instead of class-variance-authority, and ButtonLink stands in for `asChild` so no Radix Slot
// dependency is needed: it renders a Gatsby Link for internal paths and a new-tab anchor for external URLs.

const base =
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--text-primary))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0'

const variants = {
    default: 'bg-[rgb(var(--text-primary))] text-[rgb(var(--bg))] hover:opacity-90',
    outline: 'border border-primary bg-primary text-primary shadow-sm hover:bg-accent',
    ghost: 'text-primary hover:bg-accent',
    link: 'text-primary underline-offset-4 hover:underline',
} as const

const sizes = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 gap-1.5 px-3',
    lg: 'h-10 px-6',
} as const

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

export function buttonVariants({
    variant = 'default',
    size = 'default',
    className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
    return cn(base, variants[variant], sizes[size], className)
}

export function Button({
    className,
    variant,
    size,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }): JSX.Element {
    return <button data-slot="button" className={buttonVariants({ variant, size, className })} {...props} />
}

/** A link styled as a button: Gatsby Link for internal paths, a new-tab anchor for `https://` URLs. */
export function ButtonLink({
    to,
    className,
    variant,
    size,
    children,
}: {
    to: string
    className?: string
    variant?: ButtonVariant
    size?: ButtonSize
    children: React.ReactNode
}): JSX.Element {
    const classes = buttonVariants({ variant, size, className })
    if (/^https?:\/\//.test(to)) {
        return (
            <a data-slot="button" href={to} target="_blank" rel="noopener noreferrer" className={classes}>
                {children}
            </a>
        )
    }
    return (
        <Link data-slot="button" to={to} className={classes}>
            {children}
        </Link>
    )
}
