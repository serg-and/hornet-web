import { type AppType } from 'next/app'
import { apiHooks } from '~/utils/api'
import { GeistProvider, CssBaseline } from '@geist-ui/core'
import 'inter-ui/inter.css'
import Layout from '~/components/Layout'
import { createContext, useEffect, useState } from 'react'
import Toasts from '~/components/Toasts'

type Mode = 'light' | 'dark'
export const ModeContext = createContext<{
    mode: Mode
    setMode: (mode: Mode) => void
}>({ mode: 'light', setMode: mode => {} })

const MyApp: AppType = ({ Component, pageProps }) => {
    const [mode, _setMode] = useState<Mode>('light')

    const setMode = (mode: Mode) => {
        localStorage.setItem('mode', mode)
        _setMode(mode)
    }

    useEffect(() => {
        const stored = localStorage.getItem('mode') as Mode | null
        if (stored) setMode(stored)
        else
            setMode(
                window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light'
            )
    }, [])

    return (
        <GeistProvider themeType={mode}>
            <CssBaseline />
            <Toasts />
            <ModeContext.Provider value={{ mode, setMode }}>
                <Layout>
                    <Component {...pageProps} />
                </Layout>
            </ModeContext.Provider>
        </GeistProvider>
    )
}

export default apiHooks.withTRPC(MyApp)
