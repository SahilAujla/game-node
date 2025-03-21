import { GameAgent } from "@virtuals-protocol/game";
import AlchemyPlugin from "./alchemyPlugin";
import dotenv from "dotenv";

dotenv.config();


const alchemyPlugin = new AlchemyPlugin({
    credentials: {
        apiKey: process.env.ALCHEMY_API_KEY || "demo",
    },
});

const alchemyAgent = new GameAgent(process.env.GAME_AGENT_API_KEY || "demo", {
    name: "Alchemy Agent",
    goal: "Fetch transaction history for 0xe5cB067E90D5Cd1F8052B83562Ae670bA4A211a8 address on eth mainnet and find a transaction where the gas price was 15666336304",
    description: "An agent that fetches transaction history for 0xe5cB067E90D5Cd1F8052B83562Ae670bA4A211a8 address on eth mainnet and finds a transaction where the gas price was 15666336304. Stop after successful fetch of the transaction(s).",
    workers: [
        alchemyPlugin.getWorker(),
    ],
});

(async () => {
    await alchemyAgent.init();
    await alchemyAgent.run(10, {verbose: true});
})();