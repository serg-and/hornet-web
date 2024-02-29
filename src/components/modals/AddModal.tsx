/* eslint-disable @typescript-eslint/no-explicit-any */
import { Modal, useModal } from '@geist-ui/core'
import { type ReactElement, useState } from 'react'
import styled from 'styled-components'
import { ErrorNote } from '../labels'
import { useZodForm } from '../hooks/ZodForm'
import { type z } from 'zod'
import { type UseFormReturn } from 'react-hook-form'

type UseZodFormReturnType<S extends z.Schema<any, any>> = UseFormReturn<z.TypeOf<S>, any, undefined>

export default function AddModal<
    S extends z.Schema<any, any>,
    T extends z.infer<S>,
    F extends UseZodFormReturnType<S>
>(props: {
    title: string
    modalProps?: Parameters<typeof Modal>[0]
    useModal?: ReturnType<typeof useModal>
    schema: S
    onAdd: (data: T) => unknown
    children: (props: F) => ReactElement
}) {
    const modal = props.useModal ?? useModal()
    const [error, setError] = useState<Error | null>(null)
    const [busy, setBusy] = useState(false)
    const form = useZodForm(props.schema)

    const handleSubmit = form.handleSubmit(onSubmit)

    return (
        <Modal {...props.modalProps} {...modal.bindings} onClose={clean}>
            <Modal.Title style={{ alignSelf: 'start' }}>{props.title}</Modal.Title>
            <Modal.Content>
                <Form onSubmit={handleSubmit}>
                    {error && <ErrorNote message={error.message} />}
                    {props.children(form as F)}
                </Form>
            </Modal.Content>
            <Modal.Action placeholder='cancel' passive onClick={clean}>
                Cancel
            </Modal.Action>
            <Modal.Action placeholder='create' loading={busy} onClick={handleSubmit}>
                Create
            </Modal.Action>
        </Modal>
    )

    async function onSubmit(data: T) {
        try {
            setBusy(true)
            await props.onAdd(data)
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
        form.reset()
        setError(null)
        setBusy(false)
    }
}

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`
