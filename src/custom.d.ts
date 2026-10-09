export {}

declare global {
    interface Window {
        __setPreferredTheme: (theme: string) => 'light' | 'dark'
        __preferredTheme: 'light' | 'dark' | 'system'
        __theme: 'light' | 'dark'
        __onThemeChange: (theme: string) => void
    }
}
