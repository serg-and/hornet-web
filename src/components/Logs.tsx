import { Code, Text } from '@geist-ui/core'
import { CSSProperties } from 'react'
import styled from 'styled-components'
import { LogData } from '~/server/logEmitterTypes'

export default function Logs({ logs, style }: { logs: LogData[]; style?: CSSProperties }) {
    const empty = !logs.length
    return (
        <StyledCode block classic style={{ ...style, flexDirection: empty ? 'unset' : undefined }}>
            {empty && <Text style={{ opacity: 0.5 }}>Logs will show up here</Text>}
            {logs.toReversed().map((log, i) => (
                <Text key={i} type={log.type === 'error' ? 'error' : undefined}>
                    {log.data}
                </Text>
            ))}
        </StyledCode>
    )
}

const StyledCode = styled(Code)`
    display: flex;
    flex-direction: column-reverse;
    max-height: 100%;

    // firefox
    overflow: auto;
    scrollbar-color: grey transparent;

    // chrome
    overflow: overlay;

    &::-webkit-scrollbar-thumb {
        background-color: grey;
        min-height: 5px;
        height: 5px;
        border-radius: 5px;
    }
    &::-webkit-scrollbar {
        background: transparent;
        width: 5px;
    }

    p {
        width: max-content !important;
        white-space: pre-line;
        font-family: monospace;
        font-size: 0.8rem;
    }
`
