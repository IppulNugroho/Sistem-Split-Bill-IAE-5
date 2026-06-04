import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const typeDefs = readFileSync(resolve(__dirname, "schema.graphql"), "utf-8");

const bills = [
  {
    id: "1",
    title: "Dinner at Warung Padang",
    totalAmount: 150000,
    date: "2026-05-28",
    participants: [
      { id: "p1", name: "Andi", amountOwed: 50000, isPaid: true },
      { id: "p2", name: "Budi", amountOwed: 50000, isPaid: false },
      { id: "p3", name: "Citra", amountOwed: 50000, isPaid: false },
    ],
  },
  {
    id: "2",
    title: "Coffee at Kopi Kenangan",
    totalAmount: 90000,
    date: "2026-05-29",
    participants: [
      { id: "p4", name: "Dewi", amountOwed: 45000, isPaid: true },
      { id: "p5", name: "Eka", amountOwed: 45000, isPaid: true },
    ],
  },
];

let billIdCounter = bills.length;
let participantIdCounter = 5;

const resolvers = {
  Query: {
    getBills: () => bills,
  },
  Mutation: {
    createBill: (_, { title, totalAmount, date }) => {
      billIdCounter++;
      const newBill = {
        id: String(billIdCounter),
        title,
        totalAmount,
        date,
        participants: [],
      };
      bills.push(newBill);
      return newBill;
    },
    addParticipant: (_, { billId, name, amountOwed }) => {
      const bill = bills.find((b) => b.id === billId);
      if (!bill) {
        throw new Error(`Bill with id "${billId}" not found`);
      }
      participantIdCounter++;
      const newParticipant = {
        id: `p${participantIdCounter}`,
        name,
        amountOwed,
        isPaid: false,
      };
      bill.participants.push(newParticipant);
      return newParticipant;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Split Bill API ready at ${url}`);
