import { Button, Select, Table, useModal } from '@geist-ui/core'
import { api, apiHooks } from '~/utils/api'
import Page from '~/components/Page'
import { networkSchema } from '~/hornet/models'
import { ControlledInput, ControlledSelect } from '~/components/inputs/ControlledInputs'
import { tryProcedure } from '~/utils/general'
import { toasts } from '~/components/Toasts'
import AddModal from '~/components/modals/AddModal'
import EntityList from '~/components/EntityList'

export default function Networks() {
    const modal = useModal()
    const networks = apiHooks.network.getNetworks.useQuery(undefined, { networkMode: 'always' })

    return (
        <Page
            title='Networks'
            actions={[
                <Button
                    type='secondary'
                    placeholder='add network'
                    onClick={() => modal.setVisible(true)}
                >
                    Add network
                </Button>,
            ]}
        >
            <EntityList
                name='network'
                useQuery={networks}
                onRemove={async row => {
                    tryProcedure(async () => {
                        await api.network.removeNetwork.mutate({ name: row.name })
                        toasts.store.setToast({
                            text: `Removed network "${row.name}"`,
                            type: 'success',
                        })
                        networks.refetch()
                    }, 'Failed to remove network')
                }}
            >
                <Table.Column prop='name' label='name' />
                <Table.Column prop='driver' label='network driver' />
            </EntityList>
            <AddModal
                title='Add network'
                useModal={modal}
                schema={networkSchema}
                onAdd={async data => {
                    await api.network.addNetwork.mutate(data)
                    networks.refetch()
                }}
            >
                {({ control }) => (
                    <>
                        <ControlledInput
                            controller={{
                                control,
                                name: 'name',
                                defaultValue: '',
                            }}
                            input={{ label: 'name', width: '100%' }}
                        />
                        {/* <Controller
                            control={control}
                            name='driver'
                            render={({ field, fieldState }) => (
                                <Select
                                    placeholder='Network type'
                                    value={field.value ?? 'overlay'}
                                    type={fieldState.error ? 'error' : 'default'}
                                >
                                    <Select.Option value='overlay'>Overlay</Select.Option>
                                    <Select.Option value='bridge'>Bridge</Select.Option>
                                </Select>
                            )}
                        /> */}
                        <ControlledSelect
                            controller={{
                                control,
                                name: 'driver',
                                defaultValue: 'overlay',
                            }}
                            select={{ placeholder: 'Network driver' }}
                        >
                            <Select.Option value='overlay'>Overlay</Select.Option>
                            <Select.Option value='bridge'>Bridge</Select.Option>
                        </ControlledSelect>
                    </>
                )}
            </AddModal>
        </Page>
    )
}
