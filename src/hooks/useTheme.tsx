import { useState, useEffect } from 'react'

export interface ThemeOption {
    label: string
    value: string
    background?: {
        thumb?: {
            light?: string
            dark?: string
        }
        classes?: string // Full Tailwind classes that Tailwind can see
    }
}

export const themeOptions: ThemeOption[] = [
    {
        label: 'Mobius',
        value: 'mobius',
        background: {
            thumb: { light: '/brand/quirq/mobius.jpg', dark: '/brand/quirq/mobius.jpg' },
        },
    },
    {
        label: 'Light beam',
        value: 'light-beam',
        background: {
            thumb: { light: '/brand/quirq/og.jpg', dark: '/brand/quirq/og.jpg' },
        },
    },
]

const generateThemeClasses = (theme: ThemeOption) => {
    const { background } = theme

    // Only return predefined classes (colors, etc.)
    return background?.classes || ''
}

export const getWallpaperClasses = () => {
    return themeOptions.map(generateThemeClasses).join(' ')
}

export const getThemeSpecificBackgroundColors = () => {
    return themeOptions
        .filter((theme) => theme.background?.classes)
        .map((theme) => theme.background?.classes || '')
        .join(' ')
}

export default function useTheme() {
    return {
        themeOptions,
        getWallpaperClasses,
        getThemeSpecificBackgroundColors,
    }
}
