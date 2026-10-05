import React from 'react'
/**
 * Wallpapers
 *
 * Renders every desktop scene; visibility is driven by `body[data-wallpaper]`,
 * set from localStorage in theme-init.js before React hydrates (and kept in sync
 * by App.tsx). That way the saved wallpaper paints on first frame — no flash of
 * the default scene.
 *
 * Light ↔ dark within a scene is a CSS fade via the persistent `dark` class.
 * Scene ↔ scene is an instant swap.
 */

// Both scenes are quirq brand art (from quirq-ai/innernet public/brand/quirq), served from
// static/brand/quirq. In light mode a pale wash keeps the glass windows readable; dark mode
// shows the art as is.
const LightWash = () => (
    <div className="absolute inset-0 bg-[#f4f3f0]/[0.92] opacity-100 dark:opacity-0 transition-opacity duration-700 ease-in-out" />
)

const Mobius = () => (
    <div
        className="absolute inset-0 bg-black"
        style={{
            backgroundImage: "url('/brand/quirq/mobius.jpg')",
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right center',
        }}
    >
        <LightWash />
    </div>
)

const LightBeam = () => (
    <div
        className="absolute inset-0 bg-black"
        style={{
            backgroundImage: "url('/brand/quirq/og.jpg')",
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
        }}
    >
        <LightWash />
    </div>
)

// Visibility classes written out in full so Tailwind's JIT scanner can see them.
const SCENES: { key: string; Scene: React.FC; visible: string }[] = [
    { key: 'mobius', Scene: Mobius, visible: 'wallpaper-mobius:block' },
    { key: 'light-beam', Scene: LightBeam, visible: 'wallpaper-light-beam:block' },
]

export interface WallpaperGlow {
    light: string
    dark: string
}

export const WALLPAPER_GLOW: Record<string, WallpaperGlow> = {
    mobius: { light: '#f2a2d5', dark: '#d784bb' },
    'light-beam': { light: '#eac17a', dark: '#eac17a' },
}

export const DEFAULT_WALLPAPER_GLOW: WallpaperGlow = WALLPAPER_GLOW.mobius

export const getWallpaperGlow = (wallpaper: string): WallpaperGlow =>
    WALLPAPER_GLOW[wallpaper] ?? DEFAULT_WALLPAPER_GLOW

export default function Wallpapers(): JSX.Element {
    return (
        <div className="fixed inset-0 -z-10 select-none overflow-hidden pointer-events-none">
            {SCENES.map(({ key, Scene, visible }) => (
                <div key={key} className={`hidden ${visible} absolute inset-0`}>
                    <Scene />
                </div>
            ))}
        </div>
    )
}
