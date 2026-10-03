/**
 * `memory` starts an ephemeral MongoDB for laptops that do not have a server
 * or Docker. The process holds the server on globalThis so it is not garbage
 * collected while the API is running.
 */
export async function resolveMongoUri(uri: string): Promise<string> {
  if (uri !== 'memory') {
    return uri;
  }

  const holder = globalThis as { __clinicMongo?: { getUri: (dbName: string) => string } };
  if (!holder.__clinicMongo) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    holder.__clinicMongo = await MongoMemoryServer.create({
      instance: { launchTimeout: 60_000 },
    });
  }
  return holder.__clinicMongo.getUri('clinic');
}
