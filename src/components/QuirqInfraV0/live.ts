import { useEffect, useState } from 'react'
import { PRODUCTS, type Product } from './data'

// Live qq state, read in the visitor's browser from public state branches on raw.githubusercontent.com:
// gardener's tree-status branch and release's release-state branch. No credentials, no backend.
// raw.githubusercontent.com allows cross-origin reads and caches each file for up to 5 minutes.

const RAW = 'https://raw.githubusercontent.com/quirq-ai'
export const TREE_STATUS_URL = `${RAW}/gardener/refs/heads/tree-status/status`
export const RELEASE_STATE_URL = `${RAW}/release/refs/heads/release-state`
export const DAYS = 7
// The first daily canary ran on this date; earlier days are not fetched.
export const FIRST_CANARY = '2026-10-05'

export type TreeStatus = {
    state: string
    reason: string
    head: string
    green: string
    builders: Record<string, { commit: string; state: string; url?: string }>
    red: unknown[]
}

export type Pointer = { commit: string; digest: string; generation: number; updated_at: string }

export type CanaryStage = { name: string; ok: boolean; ran?: boolean; detail: string; seconds: number }

export type CanaryRun = {
    date: string
    outcome: string
    commit: string
    digest: string
    reason: string
    run_url?: string
    finished_at?: string
    stages: CanaryStage[]
}

export type RepoLive = {
    tree?: TreeStatus
    lkgr?: Pointer
    canary?: Pointer
    runs: Record<string, CanaryRun | null>
}

export type LiveState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; repos: Record<Product, RepoLive>; days: string[]; loadedAt: Date }

export async function getJson<T>(url: string): Promise<T | undefined> {
    const response = await fetch(url, { cache: 'no-cache' })
    if (response.status === 404) return undefined
    if (!response.ok) throw new Error(`${response.status} from ${url}`)
    return (await response.json()) as T
}

/** The last `count` UTC dates, newest first, as YYYY-MM-DD. */
export function recentDays(now: Date, count = DAYS): string[] {
    return Array.from({ length: count }, (_, index) => {
        const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - index))
        return day.toISOString().slice(0, 10)
    })
}

async function loadRepo(repo: Product, days: string[]): Promise<RepoLive> {
    const [tree, lkgr, canary, ...runs] = await Promise.all([
        getJson<TreeStatus>(`${TREE_STATUS_URL}/${repo}.json`),
        getJson<Pointer>(`${RELEASE_STATE_URL}/pointers/${repo}/lkgr.json`),
        getJson<Pointer>(`${RELEASE_STATE_URL}/pointers/${repo}/channels/canary.json`),
        ...days.map((day) =>
            day < FIRST_CANARY
                ? Promise.resolve(undefined)
                : getJson<CanaryRun>(`${RELEASE_STATE_URL}/canary/${repo}/runs/${day}.json`)
        ),
    ])
    return { tree, lkgr, canary, runs: Object.fromEntries(days.map((day, index) => [day, runs[index] ?? null])) }
}

export function useLiveState(): LiveState {
    const [state, setState] = useState<LiveState>({ status: 'loading' })
    useEffect(() => {
        let cancelled = false
        const days = recentDays(new Date())
        Promise.all(PRODUCTS.map((repo) => loadRepo(repo, days)))
            .then((loaded) => {
                if (cancelled) return
                const repos = Object.fromEntries(PRODUCTS.map((repo, index) => [repo, loaded[index]])) as Record<
                    Product,
                    RepoLive
                >
                setState({ status: 'ready', repos, days, loadedAt: new Date() })
            })
            .catch((error: Error) => {
                if (!cancelled) setState({ status: 'error', message: error.message })
            })
        return () => {
            cancelled = true
        }
    }, [])
    return state
}
