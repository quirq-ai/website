import { useEffect, useMemo, useState } from 'react'
import { blobatar } from 'vendor/blobatar'
import { happy, idle, sleepy, smug, surprised, thinking, wink } from 'vendor/blobatar/expression'

// A small configuration and storage adapter over the vendored Blobatar renderer, modeled on
// Euler's euler-avatar.js. Avatars render locally from a name (the seed); nothing calls a service.

export const AVATAR_STORAGE_KEY = 'quirq.avatar.v1'
const AVATAR_CHANGE_EVENT = 'quirq:avatar-change'

type Option<T extends string> = { value: T; label: string }

export const avatarShapes = [
    { value: 'auto', label: 'From name' },
    { value: 'round', label: 'Round' },
    { value: 'organic', label: 'Organic' },
    { value: 'boxy', label: 'Boxy' },
    { value: 'capsule', label: 'Capsule' },
    { value: 'nub', label: 'Nub' },
    { value: 'cloud', label: 'Cloud' },
    { value: 'droplet', label: 'Droplet' },
    { value: 'hexagon', label: 'Hexagon' },
    { value: 'sun', label: 'Sun' },
    { value: 'triangle', label: 'Triangle' },
] as const

export const avatarExpressions = [
    { value: 'idle', label: 'Calm' },
    { value: 'happy', label: 'Happy' },
    { value: 'wink', label: 'Wink' },
    { value: 'surprised', label: 'Surprised' },
    { value: 'sleepy', label: 'Sleepy' },
    { value: 'smug', label: 'Smug' },
    { value: 'thinking', label: 'Thinking' },
] as const

export const avatarBackgrounds = [
    { value: 'squircle', label: 'Soft square' },
    { value: 'circle', label: 'Circle' },
    { value: 'square', label: 'Square' },
    { value: 'transparent', label: 'None' },
] as const

export type AvatarShape = (typeof avatarShapes)[number]['value']
export type AvatarExpression = (typeof avatarExpressions)[number]['value']
export type AvatarBackground = (typeof avatarBackgrounds)[number]['value']

export type AvatarConfig = {
    name: string
    hue: number
    tone: number
    background: AvatarBackground
    shape: AvatarShape
    expression: AvatarExpression
}

export const defaultAvatarConfig: AvatarConfig = Object.freeze({
    name: 'quirq',
    hue: 210,
    tone: 0.45,
    background: 'squircle',
    shape: 'round',
    expression: 'idle',
})

// Midpoints of Blobatar 2's frozen shape bands, as in Euler, rather than a second shape renderer.
const shapePositions: Record<Exclude<AvatarShape, 'auto'>, number> = {
    round: 0.11,
    organic: 0.35,
    boxy: 0.54,
    capsule: 0.65,
    nub: 0.745,
    cloud: 0.825,
    droplet: 0.8875,
    hexagon: 0.9325,
    sun: 0.965,
    triangle: 0.99,
}
const expressions = { idle, happy, wink, surprised, sleepy, smug, thinking }

const clamp = (value: unknown, fallback: number, min: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
const choice = <T extends string>(value: unknown, options: readonly Option<T>[], fallback: T): T =>
    options.some((option) => option.value === value) ? (value as T) : fallback
// Drops C0 and C1 control characters from a name.
const isPrintable = (char: string) => {
    const code = char.charCodeAt(0)
    return code > 0x1f && (code < 0x7f || code > 0x9f)
}

export function normalizeAvatarConfig(value?: unknown): AvatarConfig {
    const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
    const name =
        typeof source.name === 'string'
            ? Array.from(Array.from(source.name.normalize('NFC')).filter(isPrintable).join('').trim())
                  .slice(0, 80)
                  .join('')
            : ''
    return {
        name: name || defaultAvatarConfig.name,
        hue: clamp(source.hue, defaultAvatarConfig.hue, 0, 359),
        // Blobatar treats a tone of 1 as wrapped; stay just below it.
        tone: clamp(source.tone, defaultAvatarConfig.tone, 0, 0.999),
        background: choice(source.background, avatarBackgrounds, defaultAvatarConfig.background),
        shape: choice(source.shape, avatarShapes, defaultAvatarConfig.shape),
        expression: choice(source.expression, avatarExpressions, defaultAvatarConfig.expression),
    }
}

export function avatarSvg(config: Partial<AvatarConfig>): string {
    const value = normalizeAvatarConfig(config)
    return blobatar(value.name, {
        hue: value.hue,
        tone: value.tone,
        background: value.background === 'transparent' ? false : value.background,
        traits: value.shape === 'auto' ? {} : { shape: shapePositions[value.shape] },
        expression: expressions[value.expression],
        title: value.name,
    })
}

export function avatarUri(config: Partial<AvatarConfig>): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(config))}`
}

export function loadAvatarConfig(): AvatarConfig {
    try {
        const text = window.localStorage.getItem(AVATAR_STORAGE_KEY)
        return normalizeAvatarConfig(text ? JSON.parse(text) : undefined)
    } catch {
        return normalizeAvatarConfig()
    }
}

/** Saves the avatar for this browser and tells every mounted avatar to repaint. */
export function saveAvatarConfig(config: Partial<AvatarConfig>): AvatarConfig {
    const normalized = normalizeAvatarConfig(config)
    try {
        window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(normalized))
    } catch {
        throw new Error('Your browser could not save the avatar. Check its storage permissions and try again.')
    }
    window.dispatchEvent(new CustomEvent(AVATAR_CHANGE_EVENT, { detail: normalized }))
    return normalized
}

/**
 * The saved avatar. Server rendering and the first client render use the default, so hydration
 * matches; the saved one paints right after mount and follows saves from any tab.
 */
export function useQuirqAvatar(): { config: AvatarConfig; uri: string } {
    const [config, setConfig] = useState<AvatarConfig>(defaultAvatarConfig)

    useEffect(() => {
        setConfig(loadAvatarConfig())
        const onChange = (event: Event) => setConfig(normalizeAvatarConfig((event as CustomEvent).detail))
        const onStorage = (event: StorageEvent) => {
            if (event.key === AVATAR_STORAGE_KEY) setConfig(loadAvatarConfig())
        }
        window.addEventListener(AVATAR_CHANGE_EVENT, onChange)
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener(AVATAR_CHANGE_EVENT, onChange)
            window.removeEventListener('storage', onStorage)
        }
    }, [])

    const uri = useMemo(() => avatarUri(config), [config])
    return { config, uri }
}
