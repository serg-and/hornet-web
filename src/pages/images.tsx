import { Button, Card, Code, Dot, Table, Tabs, Text, useModal } from '@geist-ui/core'
import { api, apiHooks } from '~/utils/api'
import Page from '~/components/Page'
import { useState } from 'react'
import styled from 'styled-components'
import { ControlledInput } from '~/components/inputs/ControlledInputs'
import { z } from 'zod'
import { Controller } from 'react-hook-form'
import AddModal from '~/components/modals/AddModal'
import EntityList from '~/components/EntityList'
import { tryProcedure } from '~/utils/general'
import { toasts } from '~/components/Toasts'
import { safeString } from '~/hornet/models'
import axios from 'axios'
import UploadBox from '~/components/inputs/UploadBox'
import useProcedureLogsModal from '~/components/modals/ProcedureLogsModal'

export default function Images() {
    const modal = useModal()
    const images = apiHooks.image.getImages.useQuery(undefined, { networkMode: 'always' })

    return (
        <Page
            title='Images'
            actions={[
                <Button
                    type='secondary'
                    placeholder='add image'
                    onClick={() => modal.setVisible(true)}
                >
                    Add image
                </Button>,
            ]}
        >
            <EntityList
                name='image'
                useQuery={images}
                onRemove={async row => {
                    tryProcedure(async () => {
                        await api.image.removeImage.mutate({ name: row.name })
                        toasts.store.setToast({
                            text: `Removed image "${row.name}"`,
                            type: 'success',
                        })
                        images.refetch()
                    }, 'Failed to remove image')
                }}
            >
                <Table.Column prop='name' label='name' />
            </EntityList>
            <AddImageModal modal={modal} onAdd={images.refetch} />
        </Page>
    )
}

function AddImageModal({
    modal,
    onAdd,
}: {
    modal: ReturnType<typeof useModal>
    onAdd: () => unknown
}) {
    const { modal: logsModal, call: addImage } = useProcedureLogsModal({
        procedure: api.image.addImage.mutate,
        title: 'Creating image',
    })
    const [from, setFrom] = useState<'dockerfile' | 'tag'>('dockerfile')
    const [file, setFile] = useState<File | undefined>(undefined)

    const schema = z.object({
        name: safeString,
        dockerfile: z
            .string()
            .optional()
            .refine(val => (from === 'dockerfile' ? val?.length : true), {
                message: 'Dockerfile can not be empty',
            }),
        publicTag: z
            .string()
            .optional()
            .refine(val => (from === 'tag' ? val?.length : true), {
                message: 'Image tag can not be empty',
            }),
    })

    return (
        <>
            <AddModal
                title='Add image'
                useModal={modal}
                schema={schema}
                onAdd={async data => {
                    const buildContext = file
                        ? await api.image.createBuildContext.mutate()
                        : undefined
                    if (file && buildContext) {
                        const payload = new FormData()
                        payload.append(file.name, file)
                        const response = await axios.post(
                            `/api/upload-build-zip?buildId=${buildContext.buildId}`,
                            payload
                        )
                        if (response.status !== 200)
                            throw new Error(`Failed to upload zip:\n${response.statusText}`)
                    }

                    await addImage({
                        image:
                            from === 'dockerfile'
                                ? { name: data.name, build: { dockerfile: data.dockerfile! } }
                                : { name: data.name, publicTag: data.publicTag },
                        buildContext,
                        zipUploaded: !!file,
                    })

                    onAdd()
                }}
                modalProps={{
                    width: '55rem',
                    style: { maxWidth: '100%' },
                }}
            >
                {({ control, setValue }) => {
                    const Name = (
                        <ControlledInput
                            controller={{
                                control: control,
                                name: 'name',
                                defaultValue: '',
                            }}
                            input={{ label: 'name', width: '20rem' }}
                        />
                    )

                    return (
                        <>
                            <ModalTabs
                                value={from}
                                onChange={val => setFrom(val as 'dockerfile' | 'tag')}
                                hideDivider
                            >
                                <Tabs.Item value={'dockerfile'} label='dockerfile'>
                                    <TabContent>
                                        {Name}
                                        <Card style={{ borderStyle: 'dashed', cursor: 'pointer' }}>
                                            <Card.Content padding={0}>
                                                <UploadBox
                                                    accept='.zip,.rar,.7zip"'
                                                    file={file}
                                                    setFile={setFile}
                                                    style={{ width: '100%', minHeight: '5rem' }}
                                                />
                                            </Card.Content>
                                        </Card>
                                        <Controller
                                            control={control}
                                            name='dockerfile'
                                            render={({ field, fieldState }) => (
                                                <>
                                                    {fieldState.error && (
                                                        <Dot type='error'>
                                                            <Text type='error' small>
                                                                {fieldState.error.message}
                                                            </Text>
                                                        </Dot>
                                                    )}
                                                    <Code
                                                        block
                                                        classic
                                                        name='Dockerfile'
                                                        contentEditable={true}
                                                        onBlur={field.onBlur}
                                                        onInput={e =>
                                                            setValue(
                                                                'dockerfile',
                                                                e.currentTarget.textContent
                                                            )
                                                        }
                                                        style={{ outline: 'none' }}
                                                    >
                                                        FROM ...
                                                    </Code>
                                                </>
                                            )}
                                        />
                                    </TabContent>
                                </Tabs.Item>
                                <Tabs.Item value={'tag'} label='public image'>
                                    <TabContent>
                                        {Name}
                                        <ControlledInput
                                            controller={{
                                                control: control,
                                                name: 'publicTag',
                                                defaultValue: '',
                                            }}
                                            input={{ label: 'image tag', width: '20rem' }}
                                        />
                                    </TabContent>
                                </Tabs.Item>
                            </ModalTabs>
                        </>
                    )
                }}
            </AddModal>
            {logsModal}
        </>
    )
}

const ModalTabs = styled(Tabs)`
    .scroll-container {
        padding-left: 0px !important;
    }
`

const TabContent = styled.div`
    padding-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
`
