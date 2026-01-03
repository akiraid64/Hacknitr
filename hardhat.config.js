require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length === 64 
  ? process.env.PRIVATE_KEY 
  : "0000000000000000000000000000000000000000000000000000000000000001";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  
  networks: {
    hardhat: { chainId: 31337 },
    
    // PRIMARY: Sepolia Testnet (Ethereum)
    sepolia: {
      url: process.env.SEPOLIA_RPC || "https://rpc.sepolia.org",
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
    
    // Alternative: Polygon Amoy
    polygon_amoy: {
      url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
      accounts: [PRIVATE_KEY],
      chainId: 80002,
    },
  },
  
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
