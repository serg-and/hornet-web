import { Modal, Text, useModal } from '@geist-ui/core'
import { type ReactNode, useState } from 'react'
import styled from 'styled-components'
import { ErrorNote } from '../labels'

export default function RemoveModal(props: {
    title?: string
    body?: string
    actionText?: string
    modalProps?: Parameters<typeof Modal>[0]
    useModal?: ReturnType<typeof useModal>
    onRemove: () => unknown
    children?: ReactNode
}) {
    const modal = props.useModal ?? useModal()
    const [error, setError] = useState<Error | null>(null)
    const [busy, setBusy] = useState(false)

    return (
        <>
            {props.children && (
                <Trigger onClick={() => setTimeout(() => modal.setVisible(true), 0)}>
                    {props.children}
                </Trigger>
            )}
            <Modal {...props.modalProps} {...modal.bindings} onClose={clean}>
                <Modal.Title style={{ alignSelf: 'start' }}>{props.title ?? 'Remove'}</Modal.Title>
                <Modal.Content>
                    {error && <ErrorNote message={error.message} />}
                    <Text p>{props.body}</Text>
                </Modal.Content>
                <Modal.Action placeholder='cancel' passive onClick={clean}>
                    Cancel
                </Modal.Action>
                <Modal.Action
                    style={{ background: 'rgba(255,0,0, 0.4)' }}
                    type='error'
                    placeholder='create'
                    loading={busy}
                    onClick={onRemove}
                >
                    {props.actionText ?? 'Remove'}
                </Modal.Action>
            </Modal>
        </>
    )

    async function onRemove() {
        try {
            setBusy(true)
            await props.onRemove()
            clean()
        } catch (err) {
            setError(err as Error)
            console.error(err)
        } finally {
            setBusy(false)
        }
    }

    function clean() {
        modal.setVisible(false)
        setError(null)
    }
}

const Trigger = styled.div`
    cursor: pointer;
`
