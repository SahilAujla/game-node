import AlchemyPlugin from '../src/alchemyPlugin';
import { ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import axios from 'axios';

// Mock the axios library
jest.mock('axios', () => ({
  post: jest.fn(),
}));

const alchemyPlugin = new AlchemyPlugin({
  credentials: {
    apiKey: "mock_api_key",
  },
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AlchemyPlugin getTransactionHistoryFunction", () => {
  it("should fetch transaction history successfully when valid arguments are passed", async () => {
    // Arrange
    const taskArgs = {
      address: "0x1E6E8695FAb3Eb382534915eA8d7Cc1D1994B152",
      networks: "eth-mainnet, base-mainnet", // Lowercase as per description
      limit: "10", // Note: args are strings in the framework
    };
    const logger = jest.fn();

    // Mock the axios.post response
    const mockResponse = {
      data: {
        after: "",
        totalCount: 2,
        transactions: [
          {
            hash: "0x0601994c475084dce75e8298c4e4f36214e3f16327d12f5f341ded85e64b880b",
            blockTimestamp: 1722740591000,
            blockNumber: 20452371,
            blockHash: "0xd0d7b586c0cf24b588cd37c37a51b5290826fe83b40440067958e731dd8eb75f",
            nonce: "7",
            transactionIndex: 90,
            fromAddress: "0x1e6e8695fab3eb382534915ea8d7cc1d1994b152",
            toAddress: "0x9fd604d7e6630efe1162c2cef24f81b0e4b952ab",
            contractAddress: "null",
            value: "50000000000000000",
            gasPrice: "2055460842",
            gas: "31500",
            network: "eth-mainnet",
            logs: [],
            internalTransactions: [],
          },
          {
            hash: "0x04573492a1ecb47102a2a70af190fa47f605a71f54ea62d94a1da1e225b7e157",
            blockTimestamp: 1655071708000,
            blockNumber: 14952522,
            blockHash: "0xc9d21965595fc96a67490fdff008234b9231f09098c0e21b3bae5be4e61c7c2f",
            nonce: "6",
            transactionIndex: 114,
            fromAddress: "0x1e6e8695fab3eb382534915ea8d7cc1d1994b152",
            toAddress: "0xe9fca552b9eb110c2d170962af740725f71f5644",
            contractAddress: "null",
            value: "160000000000000000",
            gasPrice: "61083932567",
            gas: "153310",
            network: "eth-mainnet",
            logs: [],
            internalTransactions: [],
          },
        ],
      },
    };
    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    // Act
    const result = await alchemyPlugin.getTransactionHistoryFunction.executable(taskArgs, logger);

    // Assert
    expect(result.status).toBe(ExecutableGameFunctionStatus.Done);
    expect(result.feedback).toContain("Transaction history fetched successfully.");
    expect(result.feedback).toContain("totalCount");

    // Parse the feedback to verify the transaction history
    const feedbackParts = result.feedback.split("Result: ");
    const resultString = feedbackParts[1];
    const parsedResult = JSON.parse(resultString);
    expect(parsedResult).toEqual(mockResponse.data);

    expect(logger).toHaveBeenNthCalledWith(
      1,
      "Fetching transaction history for address: 0x1E6E8695FAb3Eb382534915eA8d7Cc1D1994B152 on networks: ETH-MAINNET, BASE-MAINNET"
    );
    expect(logger).toHaveBeenNthCalledWith(2, "Successfully fetched 2 transactions.");
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.g.alchemy.com/data/v1/mock_api_key/transactions/history/by-address",
      {
        addresses: [
          {
            address: "0x1E6E8695FAb3Eb382534915eA8d7Cc1D1994B152",
            networks: ["ETH-MAINNET", "BASE-MAINNET"],
          },
        ],
        limit: 10,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
  });

  it("should fail to fetch transaction history when address is missing", async () => {
    // Arrange
    const taskArgs = {
      networks: "eth-mainnet",
      limit: "10",
    };
    const logger = jest.fn();

    // Act
    const result = await alchemyPlugin.getTransactionHistoryFunction.executable(taskArgs, logger);

    // Assert
    expect(result.status).toBe(ExecutableGameFunctionStatus.Failed);
    expect(result.feedback).toBe("Wallet address is required.");
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should fail to fetch transaction history when address is invalid", async () => {
    // Arrange
    const taskArgs = {
      address: "invalid_address",
      networks: "eth-mainnet",
      limit: "10",
    };
    const logger = jest.fn();

    // Act
    const result = await alchemyPlugin.getTransactionHistoryFunction.executable(taskArgs, logger);

    // Assert
    expect(result.status).toBe(ExecutableGameFunctionStatus.Failed);
    expect(result.feedback).toBe(
      "Invalid wallet address format. Must be a valid Ethereum address (e.g., 0x1E6E8695FAb3Eb382534915eA8d7Cc1D1994B152)."
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should fail to fetch transaction history when limit is invalid", async () => {
    // Arrange
    const taskArgs = {
      address: "0x1E6E8695FAb3Eb382534915eA8d7Cc1D1994B152",
      networks: "eth-mainnet",
      limit: "invalid", // Invalid limit value
    };
    const logger = jest.fn();

    // Act
    const result = await alchemyPlugin.getTransactionHistoryFunction.executable(taskArgs, logger);

    // Assert
    expect(result.status).toBe(ExecutableGameFunctionStatus.Failed);
    expect(result.feedback).toBe("Limit must be a positive number.");
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should fail to fetch transaction history when the API returns an error", async () => {
    // Arrange
    const taskArgs = {
      address: "0x1E6E8695FAb3Eb382534915eA8d7Cc1D1994B152",
      networks: "eth-mainnet",
      limit: "10",
    };
    const logger = jest.fn();

    // Mock an API error response
    const mockError = {
      response: {
        data: {
          error: {
            message: "Invalid API key",
          },
        },
      },
      message: "Request failed with status code 400", // Generic axios error message
    };
    (axios.post as jest.Mock).mockRejectedValue(mockError);

    // Act
    const result = await alchemyPlugin.getTransactionHistoryFunction.executable(taskArgs, logger);

    // Assert
    expect(result.status).toBe(ExecutableGameFunctionStatus.Failed);
    expect(result.feedback).toBe("Failed to fetch transaction history: Invalid API key");
    expect(logger).toHaveBeenNthCalledWith(
      1,
      "Fetching transaction history for address: 0x1E6E8695FAb3Eb382534915eA8d7Cc1D1994B152 on networks: ETH-MAINNET"
    );
    expect(logger).toHaveBeenNthCalledWith(2, "Error: Request failed with status code 400");
  });

  it("should use default values for networks and limit when not provided", async () => {
    // Arrange
    const taskArgs = {
      address: "0x1E6E8695FAb3Eb382534915eA8d7Cc1D1994B152",
    };
    const logger = jest.fn();

    // Mock the axios.post response
    const mockResponse = {
      data: {
        after: "",
        totalCount: 1,
        transactions: [
          {
            hash: "0x0601994c475084dce75e8298c4e4f36214e3f16327d12f5f341ded85e64b880b",
            blockTimestamp: 1722740591000,
            blockNumber: 20452371,
            blockHash: "0xd0d7b586c0cf24b588cd37c37a51b5290826fe83b40440067958e731dd8eb75f",
            nonce: "7",
            transactionIndex: 90,
            fromAddress: "0x1e6e8695fab3eb382534915ea8d7cc1d1994b152",
            toAddress: "0x9fd604d7e6630efe1162c2cef24f81b0e4b952ab",
            contractAddress: "null",
            value: "50000000000000000",
            gasPrice: "2055460842",
            gas: "31500",
            network: "eth-mainnet",
            logs: [],
            internalTransactions: [],
          },
        ],
      },
    };
    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    // Act
    const result = await alchemyPlugin.getTransactionHistoryFunction.executable(taskArgs, logger);

    // Assert
    expect(result.status).toBe(ExecutableGameFunctionStatus.Done);
    expect(result.feedback).toContain("Transaction history fetched successfully.");
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.g.alchemy.com/data/v1/mock_api_key/transactions/history/by-address",
      {
        addresses: [
          {
            address: "0x1E6E8695FAb3Eb382534915eA8d7Cc1D1994B152",
            networks: ["ETH_MAINNET"],
          },
        ],
        limit: 25,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
  });
});