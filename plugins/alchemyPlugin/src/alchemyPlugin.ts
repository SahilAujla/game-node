import {
    GameWorker,
    GameFunction,
    ExecutableGameFunctionResponse,
    ExecutableGameFunctionStatus,
} from "@virtuals-protocol/game";
import axios from "axios";

interface IAlchemyPluginOptions {
    id?: string;
    name?: string;
    description?: string;
    credentials: {
        apiKey: string;
    };
}

class AlchemyPlugin {
    private id: string;
    private name: string;
    private description: string;
    private apiKey: string;
    private baseUrl: string = "https://api.g.alchemy.com/data";

    constructor(options: IAlchemyPluginOptions) {
        this.id = options.id || "alchemy_worker";
        this.name = options.name || "Alchemy Worker";
        this.description =
            options.description ||
            "A worker that fetches on-chain data using the Alchemy API, such as transaction history for an EVM address (wallet address). Currently only supports fetching transaction history. Networks supported are ETH (eth-mainnet) and BASE (base-mainnet) mainnet networks.";
        this.apiKey = options.credentials.apiKey;

        // Validate API key presence
        if (!this.apiKey) {
            throw new Error("Alchemy API key is required.");
        }
    }

    public getWorker(data?: {
        id?: string;
        functions?: GameFunction<any>[];
        getEnvironment?: () => Promise<Record<string, any>>;
    }): GameWorker {
        return new GameWorker({
            id: this.id,
            name: this.name,
            description: this.description,
            functions: data?.functions || [this.getTransactionHistoryFunction],
            getEnvironment: data?.getEnvironment,
        });
    }

    /**
     * Function to fetch transaction history for a wallet address.
     * Requires the wallet address and optionally a list of networks.
     */
    get getTransactionHistoryFunction() {
        return new GameFunction({
            name: "get_transaction_history",
            description:
                "Fetches the transaction history for a given EVM address across specified blockchain networks using the Alchemy API. The networks supported are ETH (eth-mainnet) and BASE (base-mainnet) mainnet networks. Apply filters to find transactions by a specific field (e.g., gasPrice) if given.",
            args: [
                {
                    name: "address",
                    description: "The EVM address to fetch transaction history for (e.g., 0x1E6E8695FAb3Eb382534915eA8d7Cc1D1994B152)",
                    type: "string",
                },
                {
                    name: "networks",
                    description:
                        'Array of networks to query the transaction history on (e.g., ["eth-mainnet", "base-mainnet"]). Defaults to ["eth-mainnet"] if not provided. Currently only supports ETH and BASE mainnet networks.',
                    type: "array",
                },
                {
                    name: "limit",
                    description: "Maximum number of transactions to return. Defaults to 25 if not provided. Maximum limit is 50.",
                    type: "number",
                },
                {
                    name: "findBy",
                    description: "Find transactions by a specific field (e.g., gasPrice).",
                    type: "string",
                    optional: true,
                },
                {
                    name: "findValue",
                    description: "Value to find transactions by (e.g., 15666336304).",
                    type: "string",
                    optional: true,
                }
            ] as const,
            executable: async (args, logger) => {
                try {
                    // Validate wallet address
                    if (!args.address) {
                        return new ExecutableGameFunctionResponse(
                            ExecutableGameFunctionStatus.Failed,
                            "An EVM/Wallet address is required."
                        );
                    }

                    // Validate address format (basic check for Ethereum address)
                    if (!/^0x[a-fA-F0-9]{40}$/.test(args.address)) {
                        return new ExecutableGameFunctionResponse(
                            ExecutableGameFunctionStatus.Failed,
                            "Invalid EVM/Wallet address format. Must be a valid EVM address (e.g., 0x1E6E8695FAb3Eb382534915eA8d7Cc1D1994B152)."
                        );
                    }

                    const networks = args.networks ? 
                        (Array.isArray(args.networks) ? args.networks : JSON.parse(args.networks.replace(/'/g, '"'))) : 
                        ["eth-mainnet"];
                    const limit = args.limit ? parseInt(args.limit, 10) : 25;

                    // Validate limit
                    if (isNaN(limit) || limit <= 0) {
                        return new ExecutableGameFunctionResponse(
                            ExecutableGameFunctionStatus.Failed,
                            "Limit must be a positive number."
                        );
                    }

                    logger(`Fetching transaction history for address: ${args.address} on networks: ${networks}`);

                    const requestBody = {
                        addresses: [
                            {
                                address: args.address,
                                networks: networks,
                            },
                        ],
                        limit: limit,
                    };

                    logger(`Request body: ${JSON.stringify(requestBody)}`);

                    const response = await axios.post(
                        `${this.baseUrl}/v1/${this.apiKey}/transactions/history/by-address`,
                        requestBody,
                        {
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json",
                            },
                        }
                    );

                    let result = response.data;
                    if (args.findBy && args.findValue) {
                        result.transactions = result.transactions.filter((tx: any) => tx[args.findBy as string] === args.findValue);
                        result.totalCount = result.transactions.length;

                        if (!result.totalCount) {
                            return new ExecutableGameFunctionResponse(
                                ExecutableGameFunctionStatus.Failed,
                                "No transaction history found"
                            );
                        }
                    }

                    logger(`Successfully fetched ${result.totalCount} transactions.`);

                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Done,
                        JSON.stringify({
                            message: "Transaction history that fulfil the requests are fetched successfully",
                            data: result,
                        })
                    );
                } catch (e: any) {
                    logger(`Error: ${e.message}`);
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Failed,
                        `Failed to fetch transaction history: ${e.response?.data?.error?.message || e.message}`
                    );
                }
            },
        });
    }
}

export default AlchemyPlugin;