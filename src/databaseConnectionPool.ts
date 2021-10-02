import type {IDatabaseConnection} from "./types";

const connectionsPool = new Map<IDatabaseConnection, IDatabaseConnection>()

export const addConnection = (connection: IDatabaseConnection) => {
    connectionsPool.set(connection, connection)
}

export const removeConnection = (connection: IDatabaseConnection) => {
    connectionsPool.delete(connection)
}

export const releaseConnections = (): Promise<unknown> => {
    const pending: Promise<unknown>[] = []
    connectionsPool.forEach(connection => pending.push(connection.disconnect()))
    return Promise.all(pending)
}
