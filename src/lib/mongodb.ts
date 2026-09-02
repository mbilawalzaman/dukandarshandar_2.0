import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    return Promise.reject(
      new Error("DATABASE_URL is not configured. Add it in Vercel → Project Settings → Environment Variables.")
    );
  }
  const client = new MongoClient(uri);
  return client.connect();
}

function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  return global._mongoClientPromise;
}

const clientPromise: Promise<MongoClient> = new Promise((resolve, reject) => {
  getClientPromise().then(resolve, reject);
});

export default clientPromise;
