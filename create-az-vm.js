#!/usr/bin/env node

const { execSync } = require("child_process");
const crypto = require("crypto");

// Image presets for common OS types
const IMAGE_PRESETS = {
  'windows-11': 'MicrosoftWindowsDesktop:Windows-11:win11-23h2-pro:latest',
  'windows-10': 'MicrosoftWindowsDesktop:Windows-10:win10-22h2-pro:latest',
  'windows-server-2022': 'MicrosoftWindowsServer:WindowsServer:2022-datacenter:latest',
  'windows-server-2019': 'MicrosoftWindowsServer:WindowsServer:2019-datacenter:latest',
  'ubuntu': 'Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest',
  'ubuntu-20': 'Canonical:0001-com-ubuntu-server-focal:20_04-lts:latest',
  'debian': 'Debian:debian-11:11:latest',
  'centos': 'OpenLogic:CentOS:7_9:latest',
  'rhel': 'RedHat:RHEL:8-lvm:latest',
  'suse': 'SUSE:sles-15-sp3:gen2:latest'
};

// Detect OS type from image
function detectOSType(image) {
  const imageLower = image.toLowerCase();
  if (imageLower.includes('windows') || imageLower.includes('win')) {
    return 'windows';
  }
  return 'linux';
}

// Parse command line arguments
function parseArgs() {
  const args = {
    location: "northeurope",
    name: null,  // Will be set based on OS type
    size: "Standard_D2s_v3",
    image: "windows-11",  // Default to Windows 11
    resourceGroup: `vm-rg-${Date.now()}`,
    username: "azureuser",
    password: null,
    os: null  // Will be auto-detected from image
  };

  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.substring(2).split("=");
      if (key in args && value) {
        args[key] = value;
      }
    }
  });

  // Resolve image preset if used
  if (IMAGE_PRESETS[args.image]) {
    args.image = IMAGE_PRESETS[args.image];
  }

  // Detect OS type
  args.os = detectOSType(args.image);

  // Set VM name based on OS type if not provided
  if (!args.name) {
    if (args.os === 'windows') {
      // Windows has 15 char limit
      args.name = `win-${Date.now().toString().slice(-8)}`;
    } else {
      // Linux can have longer names
      args.name = `linux-vm-${Date.now()}`;
    }
  }

  // Generate password if not provided
  if (!args.password) {
    args.password = generateSecurePassword();
  }

  return args;
}

// Generate a secure password that meets Azure requirements
function generateSecurePassword() {
  // Azure password requirements:
  // - 12-72 characters
  // - Must have 3 of: lowercase, uppercase, digit, special character
  const length = 16;
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  // Ensure at least one of each required type
  let password = [
    lowercase[crypto.randomInt(lowercase.length)],
    uppercase[crypto.randomInt(uppercase.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)],
  ];

  // Fill the rest randomly
  const allChars = lowercase + uppercase + digits + special;
  for (let i = password.length; i < length; i++) {
    password.push(allChars[crypto.randomInt(allChars.length)]);
  }

  // Shuffle the password
  return password.sort(() => crypto.randomInt(3) - 1).join("");
}

// Execute command and return output
function exec(command, silent = false) {
  try {
    if (!silent) {
      console.log(`➤ ${command}`);
    }
    return execSync(command, { encoding: "utf8" }).trim();
  } catch (error) {
    if (error.stdout) {
      return error.stdout.toString().trim();
    }
    throw error;
  }
}

// Check if Azure CLI is installed
function checkAzureCli() {
  try {
    exec("az --version", true);
    return true;
  } catch {
    console.error("❌ Azure CLI is not installed.");
    console.log(
      "Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    );
    return false;
  }
}

// Check if logged in to Azure
function checkAzureLogin() {
  try {
    const account = exec("az account show", true);
    const accountData = JSON.parse(account);
    console.log(`✓ Logged in as: ${accountData.user.name}`);
    return true;
  } catch {
    console.error("❌ Not logged in to Azure.");
    console.log("Please run: az login");
    return false;
  }
}

// Create resource group
function createResourceGroup(args) {
  console.log("\n📦 Creating resource group...");
  try {
    exec(
      `az group create --name ${args.resourceGroup} --location ${args.location}`
    );
    console.log(
      `✓ Resource group '${args.resourceGroup}' created in ${args.location}`
    );
    return true;
  } catch (error) {
    console.error("❌ Failed to create resource group:", error.message);
    return false;
  }
}

// Create VM
function createVM(args) {
  const osDisplay = args.os === 'windows' ? 'Windows' : 'Linux';
  console.log(`\n🖥️  Creating ${osDisplay} VM (this may take 2-3 minutes)...`);

  // Escape password for shell - use double quotes and escape special chars
  const escapedPassword = args.password
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$");

  // Set NSG rule based on OS type
  const nsgRule = args.os === 'windows' ? 'RDP' : 'SSH';

  const command = `az vm create \
    --resource-group ${args.resourceGroup} \
    --name ${args.name} \
    --image ${args.image} \
    --admin-username ${args.username} \
    --admin-password "${escapedPassword}" \
    --size ${args.size} \
    --public-ip-sku Standard \
    --nsg-rule ${nsgRule}`;

  try {
    const output = exec(command);
    const vmData = JSON.parse(output);
    console.log("✓ VM created successfully!");
    return vmData;
  } catch (error) {
    console.error("❌ Failed to create VM:", error.message);
    return null;
  }
}

// Display connection details for Windows
function displayWindowsConnectionDetails(args, vmData) {
  console.log("\n🔌 To Connect (RDP):");
  console.log("   1. Open Remote Desktop Connection");
  console.log(`   2. Enter IP: ${vmData.publicIpAddress}`);
  console.log(`   3. Username: .\\${args.username}`);
  console.log(`   4. Password: ${args.password}`);
  
  console.log("\n💡 Tips:");
  console.log(
    "   - First RDP connection may take 5-10 minutes while Windows initializes"
  );
  console.log(
    '   - Use ".\\azureuser" as username if "azureuser" alone doesn\'t work'
  );
}

// Display connection details for Linux
function displayLinuxConnectionDetails(args, vmData) {
  console.log("\n🔌 To Connect (SSH):");
  console.log(`   ssh ${args.username}@${vmData.publicIpAddress}`);
  console.log(`   Password: ${args.password}`);
  
  console.log("\n💡 Tips:");
  console.log("   - You can also use SSH key authentication for better security");
  console.log("   - To enable GUI access, install a desktop environment and xrdp:");
  console.log("     sudo apt update && sudo apt install ubuntu-desktop xrdp -y");
}

// Display connection details
function displayConnectionDetails(args, vmData) {
  const osDisplay = args.os === 'windows' ? 'Windows' : 'Linux';
  
  console.log("\n" + "=".repeat(50));
  console.log(`🎉 ${osDisplay} VM Created Successfully!`);
  console.log("=".repeat(50));
  console.log("\n📋 VM Details:");
  console.log(`   IP Address: ${vmData.publicIpAddress}`);
  console.log(`   Username: ${args.username}`);
  console.log(`   Password: ${args.password}`);
  console.log(`   Location: ${args.location}`);
  console.log(`   VM Name: ${args.name}`);
  console.log(`   VM Size: ${args.size}`);
  console.log(`   OS Type: ${osDisplay}`);

  // OS-specific connection instructions
  if (args.os === 'windows') {
    displayWindowsConnectionDetails(args, vmData);
  } else {
    displayLinuxConnectionDetails(args, vmData);
  }

  console.log("\n⚡ Management Commands:");
  console.log(
    `   Stop VM:    az vm stop --resource-group ${args.resourceGroup} --name ${args.name}`
  );
  console.log(
    `   Start VM:   az vm start --resource-group ${args.resourceGroup} --name ${args.name}`
  );
  console.log(
    `   Delete all: az group delete --name ${args.resourceGroup} --yes`
  );
  
  console.log("   - Stop the VM when not in use to save costs");
  console.log("\n" + "=".repeat(50));
}

// Main function
async function main() {
  console.log("🚀 Azure VM Creator");
  console.log("===================\n");

  // Check prerequisites
  if (!checkAzureCli()) {
    process.exit(1);
  }

  if (!checkAzureLogin()) {
    process.exit(1);
  }

  // Parse arguments
  const args = parseArgs();

  console.log("\n📝 Configuration:");
  console.log(`   Location: ${args.location}`);
  console.log(`   VM Name: ${args.name}`);
  console.log(`   VM Size: ${args.size}`);
  console.log(`   OS Type: ${args.os}`);
  console.log(`   Resource Group: ${args.resourceGroup}`);

  // Create resources
  if (!createResourceGroup(args)) {
    process.exit(1);
  }

  const vmData = createVM(args);
  if (!vmData) {
    // Cleanup on failure
    console.log("\n🧹 Cleaning up resources...");
    exec(`az group delete --name ${args.resourceGroup} --yes --no-wait`);
    process.exit(1);
  }

  // Display results
  displayConnectionDetails(args, vmData);
}

// Show help
function showHelp() {
  console.log(`
Usage: node create-az-vm.js [options]

Options:
  --location=<location>    Azure region (default: northeurope)
  --name=<name>            VM name (default: auto-generated)
  --size=<size>            VM size (default: Standard_D2s_v3)
  --image=<image>          OS image preset or full image URN (default: windows-11)
  --resourceGroup=<name>   Resource group name (default: auto-generated)
  --username=<username>    Admin username (default: azureuser)
  --password=<password>    Admin password (default: auto-generated)
  --help                   Show this help message

Examples:
  # Create Windows 11 VM (default)
  node create-az-vm.js
  
  # Create Ubuntu VM
  node create-az-vm.js --image=ubuntu
  
  # Create Windows 10 VM in UK South
  node create-az-vm.js --image=windows-10 --location=uksouth
  
  # Create custom VM with specific image URN
  node create-az-vm.js --image=Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest

Available Image Presets:
  windows-11         - Windows 11 Pro (default)
  windows-10         - Windows 10 Pro
  windows-server-2022 - Windows Server 2022 Datacenter
  windows-server-2019 - Windows Server 2019 Datacenter
  ubuntu             - Ubuntu 22.04 LTS
  ubuntu-20          - Ubuntu 20.04 LTS
  debian             - Debian 11
  centos             - CentOS 7.9
  rhel               - Red Hat Enterprise Linux 8
  suse               - SUSE Linux Enterprise Server 15

Available VM Sizes:
  Standard_D2s_v3    - 2 vCPUs, 8 GB RAM (default)
  Standard_D4s_v3    - 4 vCPUs, 16 GB RAM
  Standard_D8s_v3    - 8 vCPUs, 32 GB RAM
  Standard_B2s       - 2 vCPUs, 4 GB RAM (burstable, cost-effective)
  Standard_B2ms      - 2 vCPUs, 8 GB RAM (burstable)

Common Locations:
  northeurope        - Ireland (default)
  uksouth            - UK South
  ukwest             - UK West
  westeurope         - Netherlands
  eastus             - Virginia
  westus             - California
  eastus2            - Virginia
  centralus          - Iowa
`);
}

// Handle help flag
if (process.argv.includes("--help")) {
  showHelp();
  process.exit(0);
}

// Run main function
main().catch((error) => {
  console.error("\n❌ Unexpected error:", error.message);
  process.exit(1);
});