import { Button, Card, Checkbox, Input, Loading, Select, Table, useModal } from '@geist-ui/core'
import { api, apiHooks } from '~/utils/api'
import Page from '~/components/Page'
import { tryProcedure } from '~/utils/general'
import { toasts } from '~/components/Toasts'
import EntityList from '~/components/EntityList'
import AddModal from '~/components/modals/AddModal'
import { serviceSchema } from '~/hornet/models'
import {
    ControlledInput,
    ControlledSelect,
    ControlledValue,
} from '~/components/inputs/ControlledInputs'
import { useState } from 'react'
import styled from 'styled-components'
import { z } from 'zod'
import { Eye, RotateCcw } from '@geist-ui/icons'
import useProcedureLogsModal from '~/components/modals/ProcedureLogsModal'

export default function Services() {
    const modal = useModal()
    const { modal: logsModal, call: openServiceLogs } = useProcedureLogsModal({
        procedure: api.service.serviceLogs.mutate,
        title: 'Logs',
        keepOpen: true,
    })

    const services = apiHooks.service.getServices.useQuery(undefined, { networkMode: 'always' })

    const [restartingSwarm, setRestartingSwarm] = useState(false)

    return (
        <Page
            title='Services'
            actions={[
                <Button
                    icon={<RotateCcw />}
                    placeholder='restart all'
                    auto
                    loading={restartingSwarm}
                    onClick={restartSwarm}
                >
                    Restart all
                </Button>,
                <Button
                    type='secondary'
                    placeholder='add service'
                    onClick={() => modal.setVisible(true)}
                    auto
                >
                    Add service
                </Button>,
            ]}
        >
            <EntityList
                name='service'
                useQuery={services}
                onRemove={async row => {
                    tryProcedure(async () => {
                        await api.service.removeService.mutate({ name: row.name })
                        toasts.store.setToast({
                            text: `Removed "${row.name}"`,
                            type: 'success',
                        })
                        services.refetch()
                    }, `Failed to remove "${row.name}"`)
                }}
                buttons={[
                    {
                        icon: <Eye />,
                        onClick: row => {
                            // setLogService(row.name)
                            // logsModal.setVisible(true)
                            openServiceLogs({ name: row.name, logId: '' })
                        },
                    },
                    {
                        icon: <RotateCcw />,
                        loading: restartingSwarm,
                        onClick: row => {
                            tryProcedure(async () => {
                                toasts.store.setToast({
                                    text: `Restarting "${row.name}"`,
                                    type: 'default',
                                })
                                await api.service.restartService.mutate({ name: row.name })
                                toasts.store.setToast({
                                    text: `Restarted "${row.name}"`,
                                    type: 'success',
                                })
                                services.refetch()
                            })
                        },
                    },
                ]}
            >
                <Table.Column prop='name' label='name' />
                <Table.Column prop='image' label='image' />
                <Table.Column prop='network' label='network' />
                <Table.Column
                    prop='expose'
                    label='ports'
                    width={100}
                    render={(val, row, i) => {
                        const expose = services.data![i]?.expose
                        return <span>{expose ? `${expose.publish}:${expose.target}` : '-'}</span>
                    }}
                />
            </EntityList>
            <AddServiceModal modal={modal} onAdd={services.refetch} />
            {logsModal}
        </Page>
    )

    async function restartSwarm() {
        setRestartingSwarm(true)
        await tryProcedure(async () => {
            toasts.store.setToast({
                text: `Restarting Docker Swarm`,
                type: 'default',
            })
            await api.service.restartSwarm.mutate()
            toasts.store.setToast({
                text: `Restarted Docker Swarm`,
                type: 'success',
            })
            services.refetch()
        })
        setRestartingSwarm(false)
    }
}

function AddServiceModal({
    modal,
    onAdd,
}: {
    modal: ReturnType<typeof useModal>
    onAdd: () => unknown
}) {
    const { modal: logsModal, call: addService } = useProcedureLogsModal({
        procedure: api.service.addService.mutate,
        title: 'Creating service',
    })
    const [expose, setExpose] = useState(false)
    const images = apiHooks.image.getImages.useQuery(undefined, { networkMode: 'always' })
    const networks = apiHooks.network.getNetworks.useQuery(undefined, { networkMode: 'always' })

    const schema = z.object({
        ...serviceSchema.shape,
        replicas: z.preprocess(x => (x ? x : undefined), z.coerce.number().min(1).optional()),
        expose: expose
            ? z.object({
                  publish: z.coerce.number().min(0).max(65535),
                  target: z.coerce.number().min(0).max(65535),
              })
            : z.any(),
    })

    return (
        <>
            <AddModal
                title='Add service'
                useModal={modal}
                schema={schema}
                onAdd={async data => {
                    await addService({
                        ...data,
                        commandArgs: data.command ? data.commandArgs : undefined,
                        replicas: data.mode === 'replicated' ? data.replicas : undefined,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        expose: expose ? data.expose : undefined,
                    })
                    onAdd()
                }}
            >
                {({ control, setValue, watch }) => {
                    const mode = watch('mode')
                    const command = watch('command')

                    return (
                        <>
                            <ControlledInput
                                controller={{
                                    control,
                                    name: 'name',
                                    defaultValue: '',
                                }}
                                input={{ label: 'name', width: '100%' }}
                            />
                            <ControlledSelect
                                controller={{
                                    control,
                                    name: 'image',
                                }}
                                select={{ clearable: true, placeholder: 'Image' }}
                            >
                                {images.isLoading ? (
                                    <Loading />
                                ) : images.data?.length ? (
                                    images.data.map(image => (
                                        <Select.Option key={image.name} value={image.name}>
                                            {image.name}
                                        </Select.Option>
                                    ))
                                ) : (
                                    <Select.Option label>No images</Select.Option>
                                )}
                            </ControlledSelect>
                            <ControlledSelect
                                controller={{
                                    control,
                                    name: 'network',
                                }}
                                select={{ clearable: true, placeholder: 'Network' }}
                            >
                                {networks.isLoading ? (
                                    <Loading />
                                ) : networks.data?.length ? (
                                    networks.data.map(network => (
                                        <Select.Option key={network.name} value={network.name}>
                                            {network.name}
                                        </Select.Option>
                                    ))
                                ) : (
                                    <Select.Option label>No networks</Select.Option>
                                )}
                            </ControlledSelect>
                            <ModeWrapper>
                                <ControlledSelect
                                    controller={{ control, name: 'mode' }}
                                    select={{ placeholder: 'mode', marginRight: 1 }}
                                >
                                    <Select.Option value='global'>global</Select.Option>
                                    <Select.Option value='replicated'>replicated</Select.Option>
                                </ControlledSelect>
                                <ControlledInput
                                    controller={{ control, name: 'replicas' }}
                                    input={{
                                        label: 'replicas',
                                        disabled: mode !== 'replicated',
                                        htmlType: 'number',
                                        width: 'auto',
                                        marginTop: -0.5,
                                    }}
                                />
                            </ModeWrapper>
                            <ExposeWrapper>
                                <Checkbox
                                    checked={expose}
                                    onChange={() => setExpose(!expose)}
                                    scale={1.2}
                                >
                                    Expose
                                </Checkbox>
                                <Card width='100%'>
                                    <Card.Content padding={0.5}>
                                        <ControlledInput
                                            controller={{ control, name: 'expose.publish' }}
                                            input={{
                                                label: 'publish',
                                                htmlType: 'number',
                                                disabled: !expose,
                                                min: 0,
                                                max: 65535,
                                                width: '100%',
                                                marginTop: -0.5,
                                                marginBottom: 0.5,
                                            }}
                                        />
                                        <ControlledInput
                                            controller={{ control, name: 'expose.target' }}
                                            input={{
                                                label: 'target',
                                                htmlType: 'number',
                                                disabled: !expose,
                                                width: '100%',
                                                min: 0,
                                                max: 65535,
                                                marginTop: -0.5,
                                            }}
                                        />
                                    </Card.Content>
                                </Card>
                            </ExposeWrapper>
                            <ControlledInput
                                controller={{
                                    control,
                                    name: 'command',
                                    defaultValue: '',
                                }}
                                input={{
                                    label: 'command',
                                    width: '100%',
                                    placeholder: 'start command',
                                }}
                            />
                            <ControlledValue controller={{ control, name: 'commandArgs' }}>
                                {({ fieldState }) => (
                                    <Input
                                        label='arguments'
                                        placeholder={
                                            command ? 'command arguments' : 'requires command'
                                        }
                                        crossOrigin='true'
                                        width='100%'
                                        type={fieldState.error ? 'error' : 'default'}
                                        disabled={!command}
                                        onChange={e => {
                                            const args = e.target.value.split(' ')
                                            setValue('commandArgs', args.length ? args : undefined)
                                        }}
                                    />
                                )}
                            </ControlledValue>
                        </>
                    )
                }}
            </AddModal>
            {logsModal}
        </>
    )
}

const ModeWrapper = styled.div`
    display: flex;
    align-items: center;
`

const ExposeWrapper = styled.div`
    display: flex;
    gap: 1rem;
    align-items: center;
`
