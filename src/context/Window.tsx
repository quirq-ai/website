import React, { createContext, useContext, useMemo } from 'react'
import { AppSetting, MenuItem } from './App'
import { MenuItemType } from 'components/RadixUI/MenuBar'

export interface WindowMenuItem {
    name: string
    url?: string
    children?: WindowMenuItem[]
}

export interface AppWindow {
    element: React.ReactNode
    key: string
    zIndex: number
    meta?: {
        title: string
    }
    coordinates?: {
        x: number
        y: number
    }
    minimized: boolean
    path: string
    fromHistory?: boolean
    props: any
    ref?: React.RefObject<HTMLDivElement>
    sizeConstraints: {
        min: {
            width: number
            height: number
        }
        max: {
            width: number
            height: number
        }
    }
    positionDefaults?: {
        x: number
        y: number
    }
    size: {
        width: number
        height: number
    }
    previousSize: {
        width: number
        height: number
    }
    position: {
        x: number
        y: number
    }
    previousPosition: {
        x: number
        y: number
    }
    fixedSize: boolean
    fromOrigin?: {
        x: number
        y: number
    }
    minimal: boolean
    appSettings?: AppSetting
    location?: Location
    modal?: {
        type: 'standard' | 'side' | 'floating'
    }
    expanded: boolean
    snapped: 'left' | 'right' | false
    windowed?: boolean
}

interface WindowProviderProps {
    children: React.ReactNode
    appWindow: AppWindow
    menu: WindowMenuItem[]
    setMenu: (menu: WindowMenuItem[]) => void
    goBack: () => void
    goForward: () => void
    canGoBack: boolean
    canGoForward: boolean

    pageOptions?: MenuItemType[]
    setPageOptions: (pageOptions: MenuItemType[]) => void
    setActiveInternalMenu: (activeInternalMenu: MenuItem) => void
    internalMenu: MenuItem[]
    activeInternalMenu?: MenuItem
    parent: MenuItem
    animating?: boolean
}

interface WindowContextType {
    appWindow?: AppWindow
    menu?: WindowMenuItem[]
    setMenu?: (menu: WindowMenuItem[]) => void
    goBack: () => void
    goForward: () => void
    canGoBack: boolean
    canGoForward: boolean

    pageOptions?: MenuItemType[]
    setPageOptions: (pageOptions: MenuItemType[]) => void
    setActiveInternalMenu: (activeInternalMenu: MenuItem) => void
    internalMenu: MenuItem[]
    activeInternalMenu?: MenuItem
    parent: MenuItem
    animating?: boolean
}

export const Context = createContext<WindowContextType>({
    goBack: () => {
        // No-op default implementation
    },
    goForward: () => {
        // No-op default implementation
    },
    canGoBack: false,
    canGoForward: false,
    pageOptions: undefined,
    setPageOptions: () => {
        // No-op default implementation
    },
    setActiveInternalMenu: () => {
        // No-op default implementation
    },
    internalMenu: [],
    activeInternalMenu: {
        name: '',
        url: '',
    },
    parent: {
        name: '',
        url: '',
        children: [],
    },
    animating: false,
})

export const Provider = ({
    appWindow,
    menu,
    setMenu,
    children,
    goBack,
    goForward,
    canGoBack,
    canGoForward,

    pageOptions,
    setPageOptions,
    setActiveInternalMenu,
    internalMenu,
    activeInternalMenu,
    parent,
    animating,
}: WindowProviderProps) => {
    // Memoize so unrelated AppWindow state changes (e.g. `closing`)
    // don't create a new value identity and re-render every useWindow()
    // consumer in the page before the close animation can paint.
    const value = useMemo(
        () => ({
            appWindow,
            menu,
            setMenu,
            goBack,
            goForward,
            canGoBack,
            canGoForward,

            pageOptions,
            setPageOptions,
            setActiveInternalMenu,
            internalMenu,
            activeInternalMenu,
            parent,
            animating,
        }),
        [
            appWindow,
            menu,
            setMenu,
            goBack,
            goForward,
            canGoBack,
            canGoForward,

            pageOptions,
            setPageOptions,
            setActiveInternalMenu,
            internalMenu,
            activeInternalMenu,
            parent,
            animating,
        ]
    )

    return <Context.Provider value={value}>{children}</Context.Provider>
}

export const useWindow = (): WindowContextType => {
    const context = useContext(Context)

    if (!context) {
        throw new Error('useWindow must be used within a WindowProvider')
    }

    return context
}
