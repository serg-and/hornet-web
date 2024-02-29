import { Text, Page as GeistPage } from '@geist-ui/core'
import { CSSProperties, ReactNode } from 'react'
import styled from 'styled-components'

export default function Page({
    title,
    children,
    style,
    actions,
}: {
    title: string
    children: ReactNode
    actions?: ReactNode[]
    style?: CSSProperties
}) {
    return (
        <StyledPage style={style}>
            <StyledHeader>
                <Text h2>{title}</Text>
                {actions && <Actions>{actions}</Actions>}
            </StyledHeader>
            <GeistPage.Content padding={0.2}>{children}</GeistPage.Content>
            {/* <GeistPage.Footer style={{ borderTop: '1px solid #333' }}>
                // TODO Good footer
            </GeistPage.Footer> */}
        </StyledPage>
    )
}

const StyledPage = styled(GeistPage)`
    width: unset !important;
    margin: 0 max(0px, calc(15% - 80px)) !important;
    padding-top: 1rem !important;
`

const StyledHeader = styled(GeistPage.Header)`
    display: flex;
    justify-content: space-between;

    @media screen and (max-width: 700px) {
        flex-direction: column;
    }
`

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
`
