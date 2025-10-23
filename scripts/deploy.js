import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Deploying StreamPay to MegaETH...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const StreamPay = await hre.ethers.getContractFactory("StreamPay");
  const streamPay = await StreamPay.deploy();
  await streamPay.waitForDeployment();

  const address = await streamPay.getAddress();
  console.log("StreamPay deployed to:", address);

  // Save contract address
  const deploymentInfo = {
    contract: "StreamPay",
    address: address,
    network: "MegaETH Testnet",
    chainId: 6342,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  const frontendDir = path.join(__dirname, "../frontend/src");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(frontendDir, "contract-address.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Copy ABI
  const artifactPath = path.join(__dirname, "../artifacts/contracts/StreamPay.sol/StreamPay.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  
  fs.writeFileSync(
    path.join(frontendDir, "contract-abi.json"),
    JSON.stringify(artifact.abi, null, 2)
  );

  console.log("Contract address and ABI saved to frontend/src/");
  console.log("\nVerify on explorer: https://megaexplorer.xyz/address/" + address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

