import React from 'react'
import { IconApp, IconSearch } from '@posthog/icons'
import Link from 'components/Link'
import ActiveWindowsPanel from 'components/ActiveWindowsPanel'
import { QuirqAppTile } from 'components/QuirqAppIcon'
import { QuirqAvatarTile } from 'components/QuirqAvatar'
import { useOpenQuirqy } from 'components/Quirqy'
import { QUIRQY_WINDOW } from 'lib/quirqAvatar'
import { useAppActions, useAppWindows } from '../../context/App'

type DockState = 'closed' | 'open' | 'active'

// Lift and labels only where hovering is real, as in Euler; touch taps would leave them stuck.
const itemClass = (state: DockState, utility = false) =>
    `group/item relative grid place-items-center ${
        utility ? 'w-[38px] xs:w-[46px]' : 'w-[50px] xs:w-[60px]'
    } h-[53px] xs:h-[62px] pt-0.5 pb-1.5 rounded-[15px] xs:rounded-[17px] text-white/90 transition-transform duration-200 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-95 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-[7px] [@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.08] motion-reduce:transition-none motion-reduce:hover:transform-none ${
        state === 'active' ? 'bg-white/[0.07]' : ''
    }`

const Indicator = ({ state }: { state: DockState }) => (
    <span
        aria-hidden="true"
        className={`absolute -bottom-1 h-1 rounded-full transition-all ${
            state === 'active'
                ? 'w-3 bg-[#e4f4ff] shadow-[0_0_8px_rgba(213,237,255,0.27)]'
                : state === 'open'
                ? 'w-1 bg-white/40'
                : 'w-1 opacity-0'
        }`}
    />
)

const Label = ({ children }: { children: React.ReactNode }) => (
    <span
        aria-hidden="true"
        className="absolute left-1/2 bottom-[calc(100%+16px)] -translate-x-1/2 translate-y-1 px-2.5 py-1.5 rounded-[9px] border border-white/15 bg-[#293344]/95 text-[11px] font-medium text-white whitespace-nowrap shadow-lg opacity-0 pointer-events-none transition [@media(hover:hover)_and_(pointer:fine)]:group-hover/item:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover/item:translate-y-0 group-focus-visible/item:opacity-100 group-focus-visible/item:translate-y-0"
    >
        {children}
    </span>
)

function AppItem({
    to,
    label,
    state,
    children,
}: {
    to: string
    label: string
    state: DockState
    children: React.ReactNode
}) {
    return (
        <Link
            to={to}
            state={{ newWindow: true }}
            aria-label={label}
            aria-current={state === 'active' ? 'page' : undefined}
            className={itemClass(state)}
        >
            {children}
            <Indicator state={state} />
            <Label>{label}</Label>
        </Link>
    )
}

/** A dock item for a window without a route, which `onClick` opens or brings forward. */
function WindowItem({
    label,
    state,
    onClick,
    children,
}: {
    label: string
    state: DockState
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-current={state === 'active' ? 'true' : undefined}
            className={itemClass(state)}
        >
            {children}
            <Indicator state={state} />
            <Label>{label}</Label>
        </button>
    )
}

function UtilityItem({
    label,
    hint,
    onClick,
    children,
}: {
    label: string
    hint?: React.ReactNode
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <button type="button" onClick={onClick} aria-label={label} className={itemClass('closed', true)}>
            {children}
            <Label>
                {label}
                {hint}
            </Label>
        </button>
    )
}

/**
 * Euler's floating dock, used as the site's navigation bar. Home, Projects and quirqy (the Blobatar
 * avatar, whose window holds its appearance) open or bring forward their windows; search and the
 * open-windows list sit after the divider.
 */
export default function Dock() {
    const { windows } = useAppWindows()
    const { openSearch, setIsActiveWindowsPanelOpen } = useAppActions()
    const openQuirqy = useOpenQuirqy()
    const focused = windows
        .filter((item) => !item.minimized)
        .reduce<(typeof windows)[number] | undefined>(
            (top, item) => (item.zIndex > (top?.zIndex ?? -1) ? item : top),
            undefined
        )
    const stateFor = (path: string): DockState => {
        const appWindow = windows.find((item) => item.path === path)
        return !appWindow ? 'closed' : focused === appWindow ? 'active' : 'open'
    }

    return (
        <>
            <nav
                aria-label="Dock"
                className="relative z-20 flex justify-center pt-2 pb-1 pointer-events-none print:hidden"
            >
                <div className="relative flex items-center gap-[5px] xs:gap-[9px] px-[9px] xs:px-[13px] pt-[9px] xs:pt-[11px] pb-[12px] xs:pb-[13px] rounded-[24px] xs:rounded-[27px] border border-white/25 bg-[#27303e]/[0.72] backdrop-blur-[28px] backdrop-saturate-150 shadow-[0_20px_58px_-18px_rgba(10,23,43,0.44),0_4px_12px_rgba(10,23,43,0.15),inset_0_1px_0_rgba(255,255,255,0.15)] pointer-events-auto reduce-transparency:bg-[#293344] reduce-transparency:backdrop-blur-none">
                    <AppItem to="/" label="Home" state={stateFor('/')}>
                        <QuirqAppTile
                            icon="home"
                            color="teal"
                            className="size-[46px] xs:size-[54px] rounded-[12px] xs:rounded-[14px]"
                            iconClassName="!size-8 xs:!size-9"
                        />
                    </AppItem>
                    <AppItem to="/projects" label="Projects" state={stateFor('/projects')}>
                        <QuirqAppTile
                            icon="rocket"
                            color="green"
                            className="size-[46px] xs:size-[54px] rounded-[12px] xs:rounded-[14px]"
                            iconClassName="!size-8 xs:!size-9"
                        />
                    </AppItem>
                    <WindowItem label="quirqy" state={stateFor(QUIRQY_WINDOW)} onClick={openQuirqy}>
                        <QuirqAvatarTile
                            className="size-[46px] xs:size-[54px] rounded-[12px] xs:rounded-[14px]"
                            avatarClassName="size-9 xs:size-[42px]"
                        />
                    </WindowItem>
                    <span aria-hidden="true" className="w-px h-[29px] xs:h-[34px] mx-px bg-white/15" />
                    <UtilityItem
                        label="Search apps"
                        hint={<kbd className="ml-1.5 px-1 rounded border border-white/25 font-sans">/</kbd>}
                        onClick={() => openSearch()}
                    >
                        <IconSearch className="size-6 xs:size-7" />
                    </UtilityItem>
                    <UtilityItem label="Open windows" onClick={() => setIsActiveWindowsPanelOpen(true)}>
                        <IconApp className="size-6 xs:size-7" />
                        {windows.length > 0 && (
                            <span className="absolute top-1.5 right-0.5 min-w-4 h-4 px-1 grid place-items-center rounded-full bg-[#e4f4ff] text-[10px] font-semibold leading-none text-[#27303e] tabular-nums">
                                {windows.length}
                            </span>
                        )}
                    </UtilityItem>
                </div>
            </nav>
            <ActiveWindowsPanel />
        </>
    )
}
