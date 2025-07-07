# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a CLI tool for creating Azure VMs quickly with sensible defaults. It's published as `@todesktop/az-vm` on npm and supports both Windows and Linux VMs.

## Key Commands

### Development & Testing
```bash
# Run the CLI locally
node create-az-vm.js --help

# Test with different OS presets
node create-az-vm.js --image=ubuntu
node create-az-vm.js --image=windows-10 --location=uksouth
```

### Publishing
```bash
# Publish to npm (requires npm login)
npm publish --access public

# Create GitHub release
gh release create v<version> --title "v<version> - Release Title" --notes "Release notes"
```

## Architecture

The entire tool is contained in a single file (`create-az-vm.js`) with these key components:

1. **IMAGE_PRESETS object**: Maps friendly names (e.g., 'ubuntu', 'windows-11') to full Azure image URNs
2. **OS Detection**: Automatically detects Windows vs Linux from image name to:
   - Set appropriate VM name length (Windows: 15 char limit)
   - Configure correct NSG rules (RDP for Windows, SSH for Linux)
   - Display OS-specific connection instructions
3. **Password Generation**: Uses crypto.randomInt() to generate 16-character passwords meeting Azure requirements
4. **Azure CLI Wrapper**: All Azure operations use execSync() to call `az` CLI commands

## Important Constraints

### Windows VM Names
Windows computer names cannot exceed 15 characters. The code handles this by using shorter names for Windows VMs:
```javascript
args.name = `win-${Date.now().toString().slice(-8)}`;  // Max 15 chars
```

### Password Escaping
Passwords are escaped for shell execution using double quotes and escaping special characters:
```javascript
const escapedPassword = args.password.replace(/"/g, '\\"').replace(/\$/g, "\\$");
```

### Default Location
The default location is `northeurope` (Ireland) - this was changed from `uksouth` in the user's version.

## Testing Azure VM Creation

When testing VM creation, remember:
- Use `az group delete --name <resource-group> --yes` to clean up all resources
- Windows VMs may take 5-10 minutes to be fully ready for RDP
- Linux VMs are created without GUI by default - GUI setup instructions are in README

## NPM Package Details

- Package name: `@todesktop/az-vm`
- CLI binary name: `az-vm`
- Supports both `npx @todesktop/az-vm` and global installation
- No dependencies - uses only Node.js built-in modules