import { env } from '$env/dynamic/private';
import { attachDatabasePool } from '@vercel/functions/db-connections';
import { MongoClient, type Db } from 'mongodb';

let databasePromise: Promise<Db> | undefined;

export async function getMongoDatabase(): Promise<Db> {
	if (!env.MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
	databasePromise ??= (async () => {
		const client = new MongoClient(env.MONGODB_URI as string, {
			maxIdleTimeMS: 5_000,
			serverSelectionTimeoutMS: 5_000
		});
		attachDatabasePool(client);
		await client.connect();
		return client.db(env.MONGODB_DATABASE || 'desmap');
	})();
	try {
		return await databasePromise;
	} catch (error) {
		databasePromise = undefined;
		throw error;
	}
}
