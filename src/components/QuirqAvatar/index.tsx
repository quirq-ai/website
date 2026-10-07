import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    AvatarConfig,
    avatarBackgrounds,
    avatarExpressions,
    avatarShapes,
    avatarUri,
    defaultAvatarConfig,
    normalizeAvatarConfig,
    saveAvatarConfig,
    useQuirqAvatar,
} from 'lib/quirqAvatar'

/** The saved Blobatar avatar for this browser, as a plain image. */
export default function QuirqAvatar({ className = 'size-10', alt = '' }: { className?: string; alt?: string }) {
    const { uri } = useQuirqAvatar()
    return <img src={uri} alt={alt} className={`object-contain select-none ${className}`} draggable={false} />
}

const colorPresets = [
    { name: 'Sky', hue: 205, swatch: '#91c8e9' },
    { name: 'Mint', hue: 145, swatch: '#9cd8b2' },
    { name: 'Lilac', hue: 265, swatch: '#c2b3ea' },
    { name: 'Peach', hue: 25, swatch: '#ecb389' },
    { name: 'Rose', hue: 340, swatch: '#e8a4b7' },
    { name: 'Gold', hue: 48, swatch: '#e2cc84' },
]
const seedNames = ['Nova', 'Milo', 'Clover', 'Orbit', 'Sora']
const randomNames = [...seedNames, 'Pip', 'Juno', 'Ziggy', 'Moss', 'Echo', 'Tofu', 'Rook', 'Kiwi', 'Lumen', 'Bean']
const tabs = [
    {
        id: 'shape',
        label: 'Shape',
        heading: 'A shape with personality.',
        copy: 'Pick a silhouette, or let the name decide.',
    },
    { id: 'color', label: 'Color', heading: 'Find your shade.', copy: 'A little color goes a long way.' },
    { id: 'eyes', label: 'Eyes', heading: 'Say it with a look.', copy: 'Choose an expression.' },
] as const
type Tab = (typeof tabs)[number]['id']

const same = (left: AvatarConfig, right: AvatarConfig) =>
    JSON.stringify(normalizeAvatarConfig(left)) === JSON.stringify(normalizeAvatarConfig(right))

const optionClass = (pressed: boolean) =>
    `relative flex flex-col items-center justify-center gap-1 min-h-[72px] min-w-0 px-1 py-2 rounded-xl border text-[11px] transition-colors ${
        pressed
            ? 'border-primary bg-white/80 dark:bg-white/10 text-primary font-semibold'
            : 'border-transparent text-secondary hover:bg-white/60 dark:hover:bg-white/5'
    }`
// Euler's slim slider: a thin track (a hue rainbow for Hue) and a white thumb.
const range =
    'block w-full h-6 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-[5px] [&::-webkit-slider-runnable-track]:rounded-full [&::-moz-range-track]:h-[5px] [&::-moz-range-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:-mt-[4.5px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#8298aa] [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#8298aa]'
const hueTrack =
    '[&::-webkit-slider-runnable-track]:bg-[linear-gradient(90deg,#e89e9e,#e3d699,#a1d8b0,#a5d6db,#a7b9e4,#d3a6da,#e89e9e)] [&::-moz-range-track]:bg-[linear-gradient(90deg,#e89e9e,#e3d699,#a1d8b0,#a5d6db,#a7b9e4,#d3a6da,#e89e9e)]'
const toneTrack = '[&::-webkit-slider-runnable-track]:bg-[#aebfcd]/60 [&::-moz-range-track]:bg-[#aebfcd]/60'
const softButton =
    'inline-flex items-center justify-center gap-2 min-h-9 px-3.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-default'

/**
 * Euler's "Make it yours" avatar editor: a live preview, a few seeds to try, and tabs for shape,
 * color and expression. Changes stay a draft until saved; the save is local to this browser.
 */
export function AvatarEditor() {
    const { config: saved } = useQuirqAvatar()
    const [draft, setDraft] = useState<AvatarConfig>(saved)
    const [tab, setTab] = useState<Tab>('shape')
    const [status, setStatus] = useState<{ message: string; tone?: 'saved' | 'error' }>({ message: '' })
    const dirty = !same(draft, saved)

    // Follow the saved avatar (it loads after mount, or changes in another tab) unless mid-edit.
    const previousSaved = useRef(saved)
    useEffect(() => {
        const previous = previousSaved.current
        previousSaved.current = saved
        setDraft((current) => (same(current, previous) ? saved : current))
    }, [saved])

    const change = (updates: Partial<AvatarConfig>) => {
        setDraft((current) => normalizeAvatarConfig({ ...current, ...updates }))
        setStatus({ message: '' })
    }

    const preview = useMemo(() => avatarUri(draft), [draft])
    const flat = useMemo(() => ({ ...draft, background: 'transparent' as const }), [draft])
    const shapePreviews = useMemo(
        () => avatarShapes.map((option) => ({ ...option, uri: avatarUri({ ...flat, shape: option.value }) })),
        [flat]
    )
    const expressionPreviews = useMemo(
        () => avatarExpressions.map((option) => ({ ...option, uri: avatarUri({ ...flat, expression: option.value }) })),
        [flat]
    )
    const seedPreviews = useMemo(() => seedNames.map((name) => ({ name, uri: avatarUri({ ...flat, name }) })), [flat])
    const activeTab = tabs.find((item) => item.id === tab) || tabs[0]

    const save = () => {
        try {
            saveAvatarConfig(draft)
            setStatus({ message: 'Saved. Your home has a new face.', tone: 'saved' })
        } catch (error) {
            setStatus({ message: (error as Error).message, tone: 'error' })
        }
    }

    return (
        <div className="grid grid-cols-1 @3xl:grid-cols-[0.94fr_1.06fr]" data-testid="avatar-editor">
            <div className="flex flex-col items-center px-6 pt-7 pb-5 bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0.5),transparent_73%)] dark:bg-none">
                <label className="flex items-center gap-3 max-w-full text-xs text-secondary">
                    <span className="whitespace-nowrap">Name / seed</span>
                    <input
                        type="text"
                        value={draft.name}
                        maxLength={80}
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) => change({ name: event.target.value })}
                        className="w-40 max-w-full bg-transparent border-0 border-b border-dashed border-primary px-1 py-1.5 text-[15px] font-semibold text-primary focus:outline-none focus:border-solid"
                    />
                </label>
                <p className="mt-2 mb-0 text-[11px] text-secondary text-center">
                    Every name has a character. Find yours.
                </p>
                <div className="relative flex items-center justify-center w-full py-6">
                    <img
                        src={preview}
                        alt={`${draft.name} avatar preview`}
                        className="size-44 @xl:size-52 object-contain drop-shadow-[0_18px_25px_rgba(76,100,127,0.1)]"
                    />
                    <span className="absolute bottom-1 inset-x-0 text-center text-[9px] tracking-[0.18em] font-semibold text-muted">
                        LIVE PREVIEW
                    </span>
                </div>
                <div className="flex gap-1.5 justify-center" aria-label="Try another name">
                    {seedPreviews.map((seed) => (
                        <button
                            key={seed.name}
                            type="button"
                            title={seed.name}
                            aria-label={`Try ${seed.name}`}
                            onClick={() => change({ name: seed.name })}
                            className="grid place-items-center size-11 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 hover:-translate-y-0.5 transition"
                        >
                            <img src={seed.uri} alt="" className="size-9 object-contain" />
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-4">
                    <button
                        type="button"
                        className={`${softButton} bg-white/70 dark:bg-white/10 border border-white dark:border-white/10 text-primary hover:bg-white dark:hover:bg-white/15`}
                        onClick={() =>
                            change({
                                name: randomNames[Math.floor(Math.random() * randomNames.length)],
                                hue: Math.floor(Math.random() * 360),
                            })
                        }
                    >
                        Randomize
                    </button>
                    <button
                        type="button"
                        className={`${softButton} text-secondary hover:text-primary hover:bg-white/60 dark:hover:bg-white/5`}
                        onClick={() => change(defaultAvatarConfig)}
                    >
                        Reset
                    </button>
                </div>
                <p className="mt-4 mb-0 text-[10px] text-muted">
                    Made with{' '}
                    <a
                        href="https://blobatar.dev/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 text-secondary"
                    >
                        Blobatar ↗
                    </a>
                </p>
            </div>

            <div className="flex flex-col min-w-0 px-5 pt-5 border-t @3xl:border-t-0 @3xl:border-l border-white/70 dark:border-white/10 bg-white/20 dark:bg-white/[0.02]">
                <div
                    className="flex gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/5"
                    role="tablist"
                    aria-label="Avatar"
                >
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            id={`avatar-tab-${item.id}`}
                            type="button"
                            role="tab"
                            aria-selected={tab === item.id}
                            aria-controls="avatar-panel"
                            onClick={() => setTab(item.id)}
                            className={`flex-1 min-h-9 rounded-lg text-xs font-semibold transition-colors ${
                                tab === item.id
                                    ? 'bg-white/90 dark:bg-white/10 text-primary shadow-sm'
                                    : 'text-secondary hover:text-primary'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <div
                    id="avatar-panel"
                    role="tabpanel"
                    aria-labelledby={`avatar-tab-${tab}`}
                    className="py-5 @3xl:h-[360px] @3xl:overflow-y-auto"
                >
                    <h3 className="m-0 text-sm font-semibold text-primary">{activeTab.heading}</h3>
                    <p className="mt-1.5 mb-4 text-[11px] text-secondary">{activeTab.copy}</p>
                    {tab === 'shape' && (
                        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Avatar shape">
                            {shapePreviews.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={draft.shape === option.value}
                                    onClick={() => change({ shape: option.value })}
                                    className={optionClass(draft.shape === option.value)}
                                >
                                    <img src={option.uri} alt="" className="size-9 object-contain" />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                    {tab === 'color' && (
                        <>
                            <div className="grid grid-cols-6 gap-2 mb-6" role="group" aria-label="Color presets">
                                {colorPresets.map((preset) => {
                                    const pressed = Math.abs(draft.hue - preset.hue) < 2
                                    return (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            aria-pressed={pressed}
                                            onClick={() => change({ hue: preset.hue })}
                                            className="flex flex-col items-center gap-2 text-[10px] text-secondary"
                                        >
                                            <span
                                                className={`size-7 rounded-full ring-4 ring-white/80 dark:ring-white/10 ${
                                                    pressed ? 'outline outline-1 outline-offset-4 outline-primary' : ''
                                                }`}
                                                style={{ background: preset.swatch }}
                                            />
                                            {preset.name}
                                        </button>
                                    )
                                })}
                            </div>
                            <label className="block mb-5 text-xs text-secondary">
                                <span className="flex justify-between mb-2">
                                    Hue <output className="text-muted tabular-nums">{Math.round(draft.hue)}°</output>
                                </span>
                                <input
                                    type="range"
                                    min={0}
                                    max={359}
                                    step={1}
                                    value={draft.hue}
                                    onChange={(event) => change({ hue: Number(event.target.value) })}
                                    className={`${range} ${hueTrack}`}
                                />
                            </label>
                            <label className="block mb-5 text-xs text-secondary">
                                <span className="flex justify-between mb-2">
                                    Color tone{' '}
                                    <output className="text-muted tabular-nums">{Math.round(draft.tone * 100)}%</output>
                                </span>
                                <input
                                    type="range"
                                    min={0}
                                    max={0.999}
                                    step={0.001}
                                    value={draft.tone}
                                    onChange={(event) => change({ tone: Number(event.target.value) })}
                                    className={`${range} ${toneTrack}`}
                                />
                            </label>
                            <label className="flex items-center justify-between gap-3 text-xs text-secondary">
                                Icon background
                                <select
                                    value={draft.background}
                                    onChange={(event) =>
                                        change({ background: event.target.value as AvatarConfig['background'] })
                                    }
                                    className="min-h-9 min-w-[9rem] rounded-lg border border-primary bg-white/70 dark:bg-white/5 pl-2 pr-8 text-xs text-primary"
                                >
                                    {avatarBackgrounds.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </>
                    )}
                    {tab === 'eyes' && (
                        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Avatar expression">
                            {expressionPreviews.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={draft.expression === option.value}
                                    onClick={() => change({ expression: option.value })}
                                    className={optionClass(draft.expression === option.value)}
                                >
                                    <img src={option.uri} alt="" className="size-8 object-contain" />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between gap-3 min-h-[68px] py-3 border-t border-white/70 dark:border-white/10">
                    <p
                        role="status"
                        className={`m-0 text-[11px] ${
                            status.tone === 'saved'
                                ? 'text-green'
                                : status.tone === 'error'
                                ? 'text-red'
                                : 'text-secondary'
                        }`}
                    >
                        {status.message || (dirty ? 'Unsaved changes.' : 'Your quirq avatar.')}
                    </p>
                    <div className="flex gap-1 shrink-0">
                        <button
                            type="button"
                            disabled={!dirty}
                            onClick={() => change(saved)}
                            className={`${softButton} text-secondary hover:text-primary`}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={!dirty}
                            onClick={save}
                            className={`${softButton} bg-[#48667e] hover:bg-[#355770] text-white shadow-sm`}
                        >
                            Save avatar →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
