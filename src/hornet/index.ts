import { spawn, spawnSync, type SpawnOptionsWithoutStdio, type ChildProcess } from 'child_process'
import { randomUUID } from 'crypto'
import { rm } from 'fs/promises'
import {
    serviceSchema,
    networkSchema,
    imageSchema,
    hornetConfigSchema,
    acceptedNetworkDrivers,
    HornetError,
    type HornetConfig,
    type SwarmConfig,
    type Network,
    type Service,
    type Image,
    type BuildContext,
} from './models'
import { ZIP_FILENAME } from '~/constants'
import {
    LogEvent,
    type LogEmitter,
    type LogData,
    type LogEventData,
} from '~/server/logEmitterTypes'

const DEFAULT_REGISTRY_PORT = 5000

const DEFAULT_NETWORKS: readonly string[] = ['bridge', 'docker_gwbridge', 'host', 'ingress']

type ArrayElement<ArrayType extends readonly unknown[]> =
    ArrayType extends readonly (infer ElementType)[] ? ElementType : never

type DockerRunOutput<Capture extends boolean> = Capture extends true
    ? { code: number | null; stdout: string[]; stderr: string[] }
    : number | null

type SpawnAsyncRef = { kill?: ChildProcess['kill'] }

export class Hornet {
    networks: Map<string, Network>
    services: Map<string, Service>
    images: Map<string, Image>
    registry: string
    localRegistryPort?: number
    externalRegistry = false
    defaultNetwork?: string
    joinToken?: string
    initSwarm = false
    logCommands = false
    addServiceTimeoutSec = 60
    logEmitter?: LogEmitter

    constructor(config?: HornetConfig, logEmitter?: LogEmitter) {
        this.networks = new Map()
        this.services = new Map()
        this.images = new Map()
        this.logEmitter = logEmitter

        config = hornetConfigSchema.parse(config ?? {})
        this.logCommands = config.logCommands ?? false

        const dockerRes = spawnSync('docker', ['-v'])
        if (dockerRes.status)
            throw new HornetError('Can not acceess docker deamon, is Docker running?')

        if (config.defaultNetwork) this.defaultNetwork = config.defaultNetwork

        if (config.initSwarm) {
            this.initSwarm = true
            this.initSwarmSync()
        }

        if (config.localRegistryPort) this.localRegistryPort = config.localRegistryPort

        if (config.registry) {
            this.registry = config.registry
            this.externalRegistry = true
        } else {
            const port = config?.localRegistryPort ?? DEFAULT_REGISTRY_PORT
            this.createRegistry(port).catch(err => this.error('Failed to create registry:\n', err))
            this.registry = `0.0.0.0:${port}`
        }

        if (config.discoverDockerRuntime)
            this.discoverDockerRuntime().catch(err =>
                this.error('Failed to discover Docker runtime:\n', err)
            )
    }

    public getNetworks(): Network[] {
        return structuredClone(Array.from(this.networks.values()))
    }

    public getNetwork(name: string): Network | undefined {
        const network = this.networks.get(name)
        if (!network) return undefined
        return structuredClone(network)
    }

    public getServices(): Service[] {
        return structuredClone(Array.from(this.services.values()))
    }

    public getService(name: string): Service | undefined {
        const service = this.services.get(name)
        if (!service) return undefined
        return structuredClone(service)
    }

    public getImages(): Image[] {
        return structuredClone(Array.from(this.images.values()))
    }

    public getImage(name: string): Image | undefined {
        const image = this.images.get(name)
        if (!image) return undefined
        return structuredClone(image)
    }

    public async loadSwarmConfig(config: SwarmConfig, emitLogId?: string) {
        await this.cleanSwarm()

        if (config.networks)
            await Promise.all(config.networks.map(n => this.addNetwork(n), emitLogId))
        if (config.images)
            await Promise.all(
                config.images.map(i => this.addImage(i, undefined, undefined, emitLogId))
            )

        await Promise.all(config.services.map(s => this.addService(s, emitLogId)))
    }

    public dumpSwarmConfig(): SwarmConfig {
        return {
            services: Array.from(this.services.values()),
            networks: this.networks.size ? Array.from(this.networks.values()) : undefined,
            images: this.images.size ? Array.from(this.images.values()) : undefined,
        }
    }

    public async addNetwork(config: Network, emitLogId?: string): Promise<Network> {
        if (this.networks.has(config.name))
            throw new HornetError(`Network with name "${config.name}" already exits`)

        const network = networkSchema.parse(config)

        await this.tryDockerRun(
            ['network', 'create', '--attachable', '--driver', config.driver, config.name],
            `Failed to create network "${config.name}"`,
            emitLogId
        )

        this.networks.set(config.name, network)
        return network
    }

    public async addService(config: Service, emitLogId?: string): Promise<Service> {
        if (this.services.has(config.name))
            throw new HornetError(`Service with name "${config.name}" already exits`)

        const service = serviceSchema.parse(config)

        const args: string[] = ['service', 'create', '--name', service.name, '--mode', service.mode]
        if (service.replicas) args.push('--replicas', `${service.replicas}`)
        if (service.expose)
            args.push('--publish', `${service.expose.publish}:${service.expose.target}`)

        const network = service.network ?? this.defaultNetwork
        if (network) args.push('--network', network)

        const registryTag = `${this.registry}/${service.image}`
        args.push(registryTag)

        if (service.command) args.push(service.command, ...(service.commandArgs ?? []))

        const ref: SpawnAsyncRef = {}
        const createServicePromise = this.tryDockerRun(
            args,
            `Failed to create service "${service.name}"`,
            emitLogId,
            undefined,
            ref
        )

        const timedOut = await new Promise<boolean>(resolve => {
            const timeout = setTimeout(() => {
                resolve(true)
            }, this.addServiceTimeoutSec * 1000)

            createServicePromise.then(() => {
                clearTimeout(timeout)
                resolve(false)
            })
        })

        if (timedOut) {
            await this.tryDockerRun(
                ['service', 'rm', service.image],
                `Failed to removed timed out service "${service.image}"`
            ).catch(err => this.error(err))

            if (!ref.kill) throw new HornetError('SpawnAsyncRef not set')

            if (ref.kill())
                throw new HornetError(
                    `Create service command timed out (${this.addServiceTimeoutSec} sec)`
                )
            else
                throw new HornetError(
                    `Create service command timed out (${this.addServiceTimeoutSec} sec), but failed too kill proccess for timeout`
                )
        }

        this.services.set(service.name, service)
        return service
    }

    public async addImage(
        config: Image,
        buildContext?: BuildContext,
        zipUploaded?: boolean,
        emitLogId?: string
    ): Promise<Image> {
        if (this.images.has(config.name))
            throw new HornetError(`Image with name "${config.name}" already exits`)

        const image = imageSchema.parse(config)
        const registryTag = `${this.registry}/${image.name}`

        if (image.build) {
            await this.buildImage(
                image.name,
                image.build.dockerfile,
                buildContext,
                zipUploaded,
                emitLogId
            )
        } else if (image.publicTag) {
            await this.tryDockerRun(
                ['pull', image.publicTag],
                `Failed to pull public image "${config.publicTag}"`,
                emitLogId
            )
        } else {
            throw new HornetError(
                `Unexpected behaviour, no build or publictag provided for image "${config.name}"`
            )
        }

        await this.tryDockerRun(
            ['tag', image.build ? image.name : image.publicTag!, registryTag],
            `Failed to create tag for image "${config.publicTag}"`,
            emitLogId
        )

        await this.tryDockerRun(
            ['push', registryTag],
            `Failed to push image "${image.name}"`,
            emitLogId
        )

        this.images.set(image.name, image)
        return image
    }

    public async createBuildContext(): Promise<BuildContext> {
        const buildId = randomUUID()
        const buildPath = `/tmp/builds/${buildId}`

        // // Seems to be a bug with Bun, dir isn't created using Node.JS API
        // await mkdir(`/tmp/builds/${buildPath}`)
        await Bun.write(`${buildPath}/Dockerfile`, 'not initialized yet...')

        return { buildId, buildPath }
    }

    private async buildImage(
        name: string,
        dockerfile: string,
        buildContext?: BuildContext,
        zipUploaded?: boolean,
        emitLogId?: string
    ) {
        const { buildPath } = buildContext ?? (await this.createBuildContext())

        try {
            // await writeFile(`${buildPath}/Dockerfile`, dockerfile)
            await Bun.write(`${buildPath}/Dockerfile`, dockerfile, {
                createPath: true,
            })

            if (zipUploaded)
                await this.spawnAsync(
                    'unzip',
                    ['-o', `${buildPath}/${ZIP_FILENAME}`, '-d', buildPath],
                    true
                )

            await this.tryDockerRun(
                ['build', '-t', name, '.'],
                `Failed to build image "${name}"`,
                emitLogId,
                { cwd: buildPath }
            )
        } finally {
            await rm(buildPath, { recursive: true })
        }
    }

    public async restartSwarm() {
        await Promise.all(Array.from(this.services.values()).map(s => this.restartService(s.name)))
    }

    public async restartService(name: string, emitLogId?: string) {
        if (!this.services.has(name)) throw new HornetError(`No service with name "${name}"`)
        await this.tryDockerRun(
            ['service', 'update', '--force', name],
            `Failed to restart service "${name}"`,
            emitLogId
        )
    }

    private initSwarmSync() {
        spawnSync('docker', ['swarm', 'leave', '--force'])

        const initRes = spawnSync('docker', ['swarm', 'init'])
        if (initRes.status)
            throw new HornetError(`Failed to initiate a new swarm:\n ${initRes.stdout.toString()}`)

        const joinToken = initRes.stdout
            .toString()
            .split('\n')
            .map(str => str.trim())
            .find(str => str.startsWith('docker swarm join --token'))
        if (!joinToken) throw new HornetError('Could not establish the swarms join token')
        this.joinToken = joinToken
    }

    public async cleanSwarm(emitLogId?: string) {
        await this.removeServices(
            Array.from(this.services.values()).map(s => s.name),
            emitLogId
        )
        await this.removeNetworks(
            Array.from(this.networks.values()).map(s => s.name),
            emitLogId
        )
        await this.removeImages(
            Array.from(this.images.values()).map(s => s.name),
            emitLogId
        )

        if (this.initSwarm) this.initSwarmSync()

        if (!this.externalRegistry) {
            const port = this.localRegistryPort ?? DEFAULT_REGISTRY_PORT
            await this.createRegistry(port).catch(err => {
                throw new HornetError(`Failed to create registry:\n ${err}`)
            })
        }
    }

    public async removeNetworks(names: string[], emitLogId?: string) {
        if (!names.length) return

        names.forEach(name => {
            if (!this.networks.has(name)) throw new HornetError(`No network with name "${name}"`)
        })
        await this.tryDockerRun(
            ['network', 'rm', ...names],
            `Failed to remove networks [${names.join(', ')}]`,
            emitLogId
        )
        names.forEach(name => this.networks.delete(name))
    }

    public async removeServices(names: string[], emitLogId?: string) {
        if (!names.length) return

        names.forEach(name => {
            if (!this.services.has(name)) throw new HornetError(`No service with name "${name}"`)
        })
        await this.tryDockerRun(
            ['service', 'rm', ...names],
            `Failed to remove services [${names.join(', ')}]`,
            emitLogId
        )
        names.forEach(name => this.services.delete(name))
    }

    public async removeImages(names: string[], emitLogId?: string) {
        if (!names.length) return

        names.forEach(name => {
            if (!this.images.has(name)) throw new HornetError(`No image with name "${name}"`)
        })
        await this.tryDockerRun(
            ['rmi', ...names.map(name => `${this.registry}/${name}`)],
            `Failed to remove images [${names.join(', ')}]`,
            emitLogId
        )
        names.forEach(name => this.images.delete(name))
    }

    public emitServicesLogs(emitLogId: string) {
        for (const service of Array.from(this.services.keys()))
            this.emitServiceLogs(service, emitLogId)
    }

    public emitServiceLogs(name: string, emitLogId: string) {
        if (!this.services.has(name)) throw new HornetError(`No service with name "${name}"`)

        const ref: SpawnAsyncRef = {}
        this.spawnAsync('docker', ['service', 'logs', name, '-f'], false, undefined, ref, emitLogId)

        // listen for closure of socket, stop process and emitter
        const remove = (data: LogEventData) => {
            if (data.event !== LogEvent.CLOSE) return

            if (ref.kill) ref.kill()
            this.logEmitter?.off(emitLogId, remove)
        }
        if (this.logEmitter) this.logEmitter.on(emitLogId, remove)
    }

    public async discoverDockerRuntime(emitLogId?: string) {
        const imageRepositories = (
            await this.tryDockerRun(
                ['image', 'list', '--format', '"{{.Repository}}"'],
                'Failed to list current Docker images',
                emitLogId
            )
        )
            .map(buff => buff.toString().replaceAll('"', ''))
            .join('\n')
            .split('\n')

        for (const repository of imageRepositories) {
            const name = repository.replace(`${this.registry}/`, '')
            if (!name || this.images.has(name)) continue

            this.images.set(name, { name, publicTag: repository })
        }

        const networks = await this.tryDockerRun(
            ['network', 'list', '--format', '"{{.Name}}\t{{.Driver}}"'],
            'Failed to list current Docker networks',
            emitLogId
        )
        networks
            .map(buff => buff.toString().replaceAll('"', ''))
            .join('\n')
            .split('\n')
            .map(str => str.split('\t') as [string, ArrayElement<typeof acceptedNetworkDrivers>])
            .filter(
                ([name, driver]) =>
                    !this.networks.has(name) &&
                    acceptedNetworkDrivers.includes(driver) &&
                    !DEFAULT_NETWORKS.includes(name)
            )
            .forEach(([name, driver]) => this.networks.set(name, { name, driver }))

        // const services = (
        //     await this.tryDockerRun(
        //         [
        //             'service',
        //             'list',
        //             '--format',
        //             '"{{.Name}}\t{{.Image}}\t{{.Mode}}\t{{.Replicas}}\t{{.Ports}}"',
        //         ],
        //         'Failed to list current Docker services',
        //          emitLogId
        //     )
        // ).map(buff => buff.toString().split('\t') as [string, string, string, string, string])

        // for (const [name, image, mode, replicas, ports] of services) {
        //     if (this.services.has(name)) continue
        // }
    }

    private log(...data: unknown[]): void {
        if (this.logCommands) console.log(' :Hornet: |info| ', ...data)
    }

    private error(...data: unknown[]): void {
        console.error(' :Hornet: |error| ', ...data)
    }

    private async spawnAsync<C extends boolean>(
        command: string,
        args: string[],
        captureStd: C,
        options?: SpawnOptionsWithoutStdio,
        ref?: SpawnAsyncRef,
        emitLogId?: string
    ): Promise<DockerRunOutput<C>> {
        return new Promise<DockerRunOutput<C>>(resolve => {
            this.log('>>>', command, args.join(' '))

            const emit = !!this.logEmitter && !!emitLogId

            const stdout: string[] = []
            const stderr: string[] = []

            const process = spawn(command, args, options)

            if (ref) {
                ref.kill = () => {
                    const res = process.kill()
                    resolve(null as DockerRunOutput<C>)
                    return res
                }
            }

            if (emit) {
                process.on('spawn', () =>
                    this.logEmitter!.emit(emitLogId, { event: LogEvent.OPEN })
                )
            }

            const handleStd =
                (type: LogData['type'], stdAcc: string[]) => (data: Buffer | undefined) => {
                    if (!data) return

                    const str = data.toString()

                    if (data) stdAcc.push(str)
                    if (emit) {
                        const emitted = this.logEmitter!.emit(emitLogId, {
                            event: LogEvent.DATA,
                            type,
                            data: str,
                        })
                        if (!emitted) this.error(`No listener for LogEmitter event "${emitLogId}"`)
                    }
                }

            if (emit || captureStd) {
                process.stdout.on('data', handleStd('data', stdout))
                process.stderr.on('data', handleStd('error', stderr))
            }

            process.on('exit', code => {
                if (emit) this.logEmitter!.emit(emitLogId, { event: LogEvent.CLOSE })

                if (captureStd) resolve({ code, stdout, stderr } as DockerRunOutput<C>)
                else resolve(code as DockerRunOutput<C>)
            })
        })
    }

    private async tryDockerRun(
        args: string[],
        errorMessage: string,
        emitLogId?: string,
        options?: SpawnOptionsWithoutStdio,
        ref?: SpawnAsyncRef
    ): Promise<string[]> {
        const res = await this.spawnAsync('docker', args, true, options, ref, emitLogId)
        if (!res) return []

        const { code, stderr, stdout } = res
        if (code) this.throwStderr(errorMessage, stderr)
        return stdout
    }

    private throwStderr(message: string, stderr: string[]) {
        const data = stderr.join('\n')
        throw new HornetError(`${message}\n ${data}`)
    }

    private async createRegistry(publish = DEFAULT_REGISTRY_PORT) {
        await this.tryDockerRun(
            [
                'service',
                'create',
                '--name',
                'registry',
                '--mode',
                'replicated',
                '--replicas',
                '1',
                '--publish',
                `${publish}:5000`,
                'registry:2',
            ],
            'Failed to create registry service'
        )
    }
}
