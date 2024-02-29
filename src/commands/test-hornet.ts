import { Hornet } from '~/hornet'
// import confirm from "@inquirer/confirm";

const hornet = new Hornet({
    initSwarm: true,
    discoverDockerRuntime: false,
})

await hornet.loadSwarmConfig({
    // networks: [
    //   {
    //     name: 'main',
    //     driver: 'overlay',
    //   },
    //   {
    //     name: 'net2',
    //     driver: 'overlay',
    //   },
    // ],
    // services: [
    //   {
    //     name: 'redis',
    //     image: 'redis:alpine',
    //     network: 'main',
    //   },
    //   {
    //     name: 'flask',
    //     image: 'flask-dummy',
    //     expose: { publish: 8000, target: 8000 },
    //     network: 'main',
    //   },
    //   {
    //     name: 'redis2',
    //     image: 'redis:alpine',
    //     network: 'net2',
    //   },
    // ],
    services: [
        { name: 'a2', image: 'redis:alpine', mode: 'replicated' },
        { name: 'b2', image: 'redis:alpine', mode: 'replicated' },
    ],
})

console.log(hornet)

console.log('\nPress Enter to quit and clean Hornet')
// @ts-expect-error is fine
for await (const _ of Bun.stdin.stream()) break

await hornet.cleanSwarm()
