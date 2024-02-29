import { Button, Popover, Tabs, Text } from '@geist-ui/core'
import { Menu, Moon, Sun } from '@geist-ui/icons'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useContext, useEffect } from 'react'
import styled from 'styled-components'
import { ModeContext } from '~/pages/_app'

const tabs = {
    swarm: '/',
    services: '/services',
    networks: '/networks',
    images: '/images',
} as const

type ArrayElement<ArrayType extends readonly unknown[]> =
    ArrayType extends readonly (infer ElementType)[] ? ElementType : never

type Tab = keyof typeof tabs

export default function Navbar() {
    const router = useRouter()
    const { mode, setMode } = useContext(ModeContext)

    const value = Object.entries(tabs).find(([_, route]) => route === router.route)?.[0]

    // prefetch all other tab routes
    useEffect(() => {
        Object.values(tabs)
            .filter(route => route !== router.route)
            .forEach(route => router.prefetch(route))
    }, [])

    return (
        <Nav
            style={{
                backgroundColor:
                    mode === 'light' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.75)',
            }}
        >
            <NavContent>
                <LeftWrapper>
                    <Text
                        h3
                        style={{
                            display: 'flex',
                            alignSelf: 'center',
                            gap: '0.2rem',
                            margin: 0,
                        }}
                    >
                        <span style={{ fontWeight: 600 }}>Hornet</span>
                        <span style={{ fontWeight: 100 }}>/</span>
                        <span style={{ fontWeight: 200 }}>web</span>
                    </Text>
                    <Tabs
                        id='tabs'
                        value={value}
                        onChange={name => router.push(tabs[name as Tab])}
                        style={{ display: 'flex', alignSelf: 'end' }}
                        hideDivider
                    >
                        {Object.keys(tabs).map(name => (
                            <Tabs.Item key={name} label={name} value={name} />
                        ))}
                    </Tabs>
                </LeftWrapper>
                <RightWrapper>
                    <Button
                        id='mode-toggle'
                        icon={mode === 'light' ? <Sun /> : <Moon />}
                        placeholder='toggle dark mode'
                        scale={0.7}
                        auto
                        onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
                    >
                        {mode === 'light' ? 'Light' : 'Dark'}
                    </Button>
                    <Popover
                        id='menu'
                        padding={0.5}
                        content={
                            Object.entries(tabs).map(([name, route], i) => (
                                <Link key={name} href={route}>
                                    <Popover.Item>
                                        <Text margin={0.4} style={{ textTransform: 'capitalize' }}>
                                            {name}
                                        </Text>
                                    </Popover.Item>
                                </Link>
                            )) as any
                        }
                    >
                        <Button
                            iconRight={<Menu />}
                            placeholder='menu'
                            scale={2 / 3}
                            marginLeft={1}
                            auto
                            px={0.6}
                        />
                    </Popover>
                </RightWrapper>
            </NavContent>
        </Nav>
    )
}

const Nav = styled.nav`
    position: fixed;
    top: 0px;
    height: 55px;
    width: 100%;
    box-shadow: rgba(0, 0, 0, 0.1) 0px 0px 15px 0px;
    backdrop-filter: saturate(1.8) blur(6px);
    border-bottom: 1px solid #333;
    z-index: 500;

    #menu {
        display: none !important;
    }

    @media screen and (max-width: 700px) {
        #tabs,
        #mode-toggle > div {
            display: none !important;
        }
        #menu {
            display: block !important;
        }
    }
`

const NavContent = styled.div`
    height: 100%;
    margin: 0 calc(max(0px, calc(15% - 80px)) + calc(1.34 * 16px));
    display: flex;
    justify-content: space-between;
`

const LeftWrapper = styled.div`
    display: flex;
    height: 100%;
    gap: 1rem;
`

const RightWrapper = styled.div`
    display: flex;
    align-items: center;
    height: 100%;
`
