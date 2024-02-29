/* eslint-disable @typescript-eslint/no-explicit-any */
import { Loading, Modal, useModal } from '@geist-ui/core'
import Logs from '../Logs'
import { useRef, useState } from 'react'
import { type LogData } from '~/server/logEmitterTypes'
import { type WithLogSocketRef, withLogSocket } from '~/utils/general'
import { toasts } from '../Toasts'

const baseModalProps = {
    width: '100%',
    style: { maxWidth: '100%' },
} as const

export default function useProcedureLogsModal<T extends (input: any) => Promise<R>, R>(props: {
    procedure: T
    title: string
    useModal?: ReturnType<typeof useModal>
    modalProps?: Parameters<typeof Modal>[0]
    onClose?: () => void
    keepOpen?: boolean
}) {
    const modal = props.useModal ?? useModal()
    const forceUpdate = useState(0)
    const [loading, setLoading] = useState(false)
    const closeSocketRef = useRef<WithLogSocketRef>({})
    const statusRef = useRef({
        connecting: false,
        connected: false,
        logs: [] as LogData[],
    })
    const {
        current: { connecting, connected, logs },
    } = statusRef

    const modalProps = { ...baseModalProps, ...props.modalProps }

    return {
        call,
        close,
        modal: (
            <Modal {...modalProps} {...modal.bindings} onClose={clean}>
                <Modal.Title style={{ alignSelf: 'start' }}>{props.title}</Modal.Title>
                <Modal.Content>
                    {connected ? (
                        <Logs logs={logs} style={{ minHeight: '2rem', maxHeight: '75vh' }} />
                    ) : connecting ? (
                        <Loading />
                    ) : null}
                </Modal.Content>
                <Modal.Action placeholder='cancel' passive onClick={clean} loading={loading}>
                    Close
                </Modal.Action>
            </Modal>
        ),
    }

    async function call(input: Parameters<T>[0]): Promise<R | undefined> {
        updateStatus({
            connecting: true,
            connected: false,
            logs: [],
        })
        modal.setVisible(true)
        closeSocketRef.current.close = undefined

        if (!props.keepOpen) setLoading(true)

        try {
            const res: R | undefined = await withLogSocket(props.procedure, input, {
                onOpen() {
                    updateStatus({
                        connecting: false,
                        connected: true,
                    })
                },
                onData(data) {
                    const newLogs = statusRef.current.logs.slice(0)
                    newLogs.push(data)
                    updateStatus({ logs: newLogs })
                },
                onError(event) {
                    console.error(event)
                    toasts.store.setToast({
                        text: 'An error occured connecting to live logs',
                        type: 'error',
                    })
                },
                ref: closeSocketRef.current,
                keepOpen: props.keepOpen,
            })

            if (!props.keepOpen) close()

            return res
        } finally {
            setLoading(false)
        }
    }

    function updateStatus(newStatus: Partial<typeof statusRef.current>) {
        Object.assign(statusRef.current, newStatus)
        forceUpdate[1](++forceUpdate[0])
    }

    function close() {
        modal.setVisible(false)
        clean()
    }

    function clean() {
        modal.setVisible(false)
        updateStatus({
            connecting: false,
            connected: false,
            logs: [],
        })
        setLoading(false)
        if (props.onClose) props.onClose()
        if (closeSocketRef.current.close) closeSocketRef.current.close()
    }
}
