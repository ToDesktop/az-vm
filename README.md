# @todesktop/az-vm

Quick and easy Azure VM creation CLI tool supporting Windows and Linux VMs.

At [ToDesktop](https://todesktop.com) we use Azure VMs to quickly test x86-based Windows apps. It's useful for us because Apple Silicon Macs, are slow to emulate x86 VMs, so we spin up VMs in Azure instead for testing.

## Features

- 🚀 **Quick VM Creation** - Create VMs with a single command
- 🖥️ **Multi-OS Support** - Windows 11/10, Ubuntu, Debian, CentOS, and more
- 🔐 **Secure Passwords** - Auto-generates secure passwords meeting Azure requirements
- 📍 **Smart Defaults** - Sensible defaults for all parameters
- 🌍 **Global Regions** - Support for all Azure regions
- 💰 **Cost Conscious** - Includes commands to stop/delete VMs when not in use

## Prerequisites

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed
- Azure account with active subscription
- Logged in to Azure CLI (`az login`)

## Installation

You don't need to install this tool! Use it directly with npx:

```bash
npx @todesktop/az-vm
```

Or install globally if you prefer:

```bash
npm install -g @todesktop/az-vm
```

## Usage

### Quick Start

Create a Windows 11 VM with all defaults:

```bash
# Using npx (no installation required)
npx @todesktop/az-vm

# Using global install
az-vm
```

Create an Ubuntu VM:

```bash
# Using npx
npx @todesktop/az-vm --image=ubuntu

# Using global install
az-vm --image=ubuntu
```

### Examples

```bash
# Windows 10 in UK South
npx @todesktop/az-vm --image=windows-10 --location=uksouth
# or with global install: az-vm --image=windows-10 --location=uksouth

# Ubuntu with custom name
npx @todesktop/az-vm --image=ubuntu --name=my-dev-server
# or with global install: az-vm --image=ubuntu --name=my-dev-server

# Windows Server 2022 with larger size
npx @todesktop/az-vm --image=windows-server-2022 --size=Standard_D4s_v3

# Custom image URN
npx @todesktop/az-vm --image=Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest
```

### Available Options

| Option            | Description            | Default           |
| ----------------- | ---------------------- | ----------------- |
| `--location`      | Azure region           | `northeurope`     |
| `--name`          | VM name                | Auto-generated    |
| `--size`          | VM size                | `Standard_D2s_v3` |
| `--image`         | OS image preset or URN | `windows-11`      |
| `--resourceGroup` | Resource group name    | Auto-generated    |
| `--username`      | Admin username         | `azureuser`       |
| `--password`      | Admin password         | Auto-generated    |
| `--help`          | Show help              | -                 |

### Image Presets

| Preset                | Description                     |
| --------------------- | ------------------------------- |
| `windows-11`          | Windows 11 Pro (default)        |
| `windows-10`          | Windows 10 Pro                  |
| `windows-server-2022` | Windows Server 2022 Datacenter  |
| `windows-server-2019` | Windows Server 2019 Datacenter  |
| `ubuntu`              | Ubuntu 22.04 LTS                |
| `ubuntu-20`           | Ubuntu 20.04 LTS                |
| `debian`              | Debian 11                       |
| `centos`              | CentOS 7.9                      |
| `rhel`                | Red Hat Enterprise Linux 8      |
| `suse`                | SUSE Linux Enterprise Server 15 |

### VM Sizes

| Size              | vCPUs | RAM   | Description               |
| ----------------- | ----- | ----- | ------------------------- |
| `Standard_D2s_v3` | 2     | 8 GB  | Default, general purpose  |
| `Standard_D4s_v3` | 4     | 16 GB | Better performance        |
| `Standard_D8s_v3` | 8     | 32 GB | High performance          |
| `Standard_B2s`    | 2     | 4 GB  | Burstable, cost-effective |
| `Standard_B2ms`   | 2     | 8 GB  | Burstable with more RAM   |

### Common Locations

| Location      | Description       |
| ------------- | ----------------- |
| `northeurope` | Ireland (default) |
| `uksouth`     | UK South          |
| `westeurope`  | Netherlands       |
| `eastus`      | Virginia          |
| `westus`      | California        |

## Connecting to Your VM

### Windows VMs

Windows VMs come with Remote Desktop (RDP) enabled out of the box. Simply:

```
1. Open Microsoft Remote Desktop (built into Windows, available for Mac/iOS/Android)
2. Enter the provided IP address
3. Username: .\azureuser
4. Use the generated password
```

No additional setup required!

### Linux VMs

Linux VMs are created as servers without a GUI by default. Connect via SSH:

```bash
ssh azureuser@<ip-address>
```

#### Setting up GUI Access (Optional)

Unlike Windows VMs, Linux VMs require additional setup for remote desktop access. Here are your options:

**For Ubuntu/Debian:**

1. **Install desktop environment and VNC server:**

```bash
# Update packages
sudo apt update

# Install lightweight desktop environment (XFCE) and VNC
sudo apt install xfce4 xfce4-goodies tightvncserver -y
```

2. **Configure VNC:**

```bash
# Start VNC server to create config files
vncserver

# You'll be prompted to create a VNC password (max 8 characters)
# Kill the server after initial setup
vncserver -kill :1

# Backup and edit the startup script
mv ~/.vnc/xstartup ~/.vnc/xstartup.bak
nano ~/.vnc/xstartup
```

3. **Add this content to ~/.vnc/xstartup:**

```bash
#!/bin/bash
xrdb $HOME/.Xresources
startxfce4 &
```

4. **Make it executable and start VNC:**

```bash
chmod +x ~/.vnc/xstartup
vncserver -geometry 1920x1080 -depth 24
```

5. **Open VNC port in Azure (5901):**

```bash
az vm open-port --resource-group <resource-group> --name <vm-name> --port 5901
```

6. **Connect from your local machine:**

- Download a VNC client (RealVNC, TightVNC, or TigerVNC)
- Connect to: `<vm-ip>:5901`
- Use the VNC password you created

**For better performance, use X2Go instead:**

```bash
# Install X2Go server
sudo apt-add-repository ppa:x2go/stable
sudo apt update
sudo apt install x2goserver x2goserver-xsession -y
```

Then use X2Go Client on your local machine to connect.

#### Alternative: xRDP (Recommended for Windows users)

xRDP allows you to use Windows Remote Desktop to connect to Linux:

```bash
# Install xRDP and desktop environment
sudo apt update
sudo apt install ubuntu-desktop xrdp -y

# Configure xRDP to use port 3389
sudo systemctl enable xrdp
sudo systemctl restart xrdp

# For better performance with xRDP
echo "exec startxfce4" > ~/.xsession
```

Then connect using Windows Remote Desktop client to port 3389.

## Managing Your VM

### Stop VM (save costs)

```bash
az vm stop --resource-group <resource-group> --name <vm-name>
```

### Start VM

```bash
az vm start --resource-group <resource-group> --name <vm-name>
```

### Delete Everything

```bash
az group delete --name <resource-group> --yes
```

## Tips

- 🕐 First connection to Windows VMs may take 2-3 minutes while Windows initializes
- 💸 Always stop or delete VMs when not in use to avoid charges
- 🔑 Save the generated password - it's only shown once
- 🌐 Choose a location close to you for better performance
- 🖥️ For Linux GUI access: xRDP works best with Windows clients, VNC with Mac/Linux
- 🚀 Use lightweight desktop environments (XFCE) for better remote desktop performance

## License

MIT © ToDesktop

## Contributing

Issues and PRs welcome at [github.com/todesktop/az-vm](https://github.com/todesktop/az-vm)
