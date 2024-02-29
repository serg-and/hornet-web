import { Button, ButtonGroup, Code, Modal, useModal } from '@geist-ui/core'
import { Download, Upload } from '@geist-ui/icons'
import { useEffect, useRef, useState } from 'react'
import Page from '~/components/Page'
import { ErrorNote } from '~/components/labels'
import { api } from '~/utils/api'
import { WithLogSocketRef, tryProcedure, withLogSocket } from '~/utils/general'
import { saveAs } from 'file-saver'
import RemoveModal from '~/components/modals/RemoveModal'
import { toasts } from '~/components/Toasts'
import { LogData } from '~/server/logEmitterTypes'
import Logs from '~/components/Logs'
import useProcedureLogsModal from '~/components/modals/ProcedureLogsModal'

export default function Swarm() {
    const forceUpdate = useState(0)
    const logsRef = useRef([] as LogData[])
    const [error, setError] = useState<Error | null>(null)
    const [loadError, setLoadError] = useState<Error | null>(null)
    const [busy, setBusy] = useState(false)
    const [swarmConfig, setSwarmConfig] = useState('{}')
    const loadConfigModal = useModal()
    const removeModal = useModal()
    const { modal: loadConfigLogsModal, call: callLoadConfig } = useProcedureLogsModal({
        procedure: api.swarm.loadConfig.mutate,
        title: 'Loading config',
    })

    useEffect(() => {
        const ref: WithLogSocketRef = {}
        withLogSocket(api.service.servicesLogs.mutate, {} as any, {
            onData: log => {
                logsRef.current.push(log)
                forceUpdate[1](++forceUpdate[0])
            },
            keepOpen: true,
            ref,
        })

        return () => {
            logsRef.current = []
            forceUpdate[1](++forceUpdate[0])
            if (ref.close) ref.close()
        }
    }, [])

    return (
        <Page
            title='Swarm'
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            actions={[
                <ButtonGroup key='btn-grp'>
                    <Button
                        icon={<Download />}
                        placeholder='download swarm config'
                        onClick={onDownloadConfig}
                    >
                        Download Swarm config
                    </Button>
                    <Button
                        icon={<Upload />}
                        placeholder='load swarm config'
                        onClick={() => loadConfigModal.setVisible(true)}
                    >
                        Load Swarm config
                    </Button>
                </ButtonGroup>,
            ]}
        >
            {error && <ErrorNote message={error.message} />}
            <Logs logs={logsRef.current} style={{ minHeight: '50vh', maxHeight: '75vh' }} />
            <Modal {...loadConfigModal.bindings} width='55rem' style={{ maxWidth: '100%' }}>
                <Modal.Title style={{ alignSelf: 'start' }}>Load Swarm config</Modal.Title>
                <Modal.Content>
                    {loadError && <ErrorNote message={loadError.message} />}
                    <Code
                        block
                        classic
                        name='config.json'
                        contentEditable={true}
                        onInput={e => setSwarmConfig(e.currentTarget.textContent)}
                        style={{ outline: 'none' }}
                    >
                        {'{}'}
                    </Code>
                </Modal.Content>
                <Modal.Action
                    placeholder='cancel'
                    passive
                    onClick={() => loadConfigModal.setVisible(false)}
                >
                    Cancel
                </Modal.Action>
                <Modal.Action placeholder='Load' loading={busy} onClick={confirmLoadConfig}>
                    Load
                </Modal.Action>
            </Modal>
            <RemoveModal
                title='Are you sure'
                body='Loading a new Swarm config will reset all current settings, all current images, networks and services will be removed!'
                actionText='confirm'
                useModal={removeModal}
                onRemove={onLoadConfig}
            />
            {loadConfigLogsModal}
        </Page>
    )

    async function onDownloadConfig() {
        const config = await tryProcedure(
            api.swarm.dumpConfig.mutate,
            'Failed to retrieve Swarm config'
        )
        const blob = new Blob([JSON.stringify(config)], { type: 'text/plain;charset=utf-8' })
        saveAs(blob, 'swarm-config.json')
    }

    function confirmLoadConfig() {
        removeModal.setVisible(true)
    }

    async function onLoadConfig() {
        removeModal.setVisible(false)
        setBusy(true)

        try {
            await callLoadConfig(JSON.parse(swarmConfig))
            // await api.swarm.loadConfig.mutate(JSON.parse(swarmConfig))
            toasts.store.setToast({ type: 'success', text: 'Loaded new Swarm config' })
            loadConfigModal.setVisible(false)
            setLoadError(null)
        } catch (err) {
            setLoadError(err as Error)
            console.error(err)
        } finally {
            setBusy(false)
        }
    }
}
