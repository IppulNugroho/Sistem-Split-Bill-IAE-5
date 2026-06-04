import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./db.js";
import resolvers from "./resolvers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const typeDefs = readFileSync(resolve(__dirname, "schema.graphql"), "utf-8");

// Koneksi ke MongoDB terlebih dahulu, lalu start Apollo Server
await connectDB();

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Split Bill API ready at ${url}`);
