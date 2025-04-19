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
    omaxNetwork: {
      url: "https://mainapi.omaxray.com",
      chainId: 311,
      accounts: ["0x73a541b4f6fb75bd5b39c34872815130ae39f78056f5a4c9487e76268a068b88"],
    },
  },
};

export default config;
