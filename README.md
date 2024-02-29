# Hornet Web

A web interface for managing Docker Swarms.

Features:

-   Add/Remove images, networks and services
-   Save Swarm config to JSON and rebuild Swarm from config
-   View services logs
-   Automatic local images registry
-   Restart services
-   Multi host Swarm compatible

## Running

Requires `Bun` and `Node.js` to be installed

### Dev mode

```bash
bun i  # install dependencies
bun --bun next dev  # start server
```

### Production mode

```bash
bun i  # install dependencies
bun --bun next build  # create production build
bun --bun next start  # start server
```
