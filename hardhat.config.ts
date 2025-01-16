import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {}, // Default Hardhat network
    loopnetwork: {
      url: "https://api.mainnetloop.com", // LoopNetwork RPC URL
      chainId: 15551, // Replace with the actual chain ID for LoopNetwork
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [], // Load private key from .env
    },
  },
};

export default config;
