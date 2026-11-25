# Warm Hands

Warm Hands is a React/Vite clinic-conversation app for a doctor and patient. It includes an optional local FastAPI service for Myanmar Sign Language camera recognition and message relay.

## Prerequisites

- Node.js 20 or newer (Node 22 LTS recommended)
- Python 3.10 or newer for the AI service

## Run the web app

```powershell
cd Warm-Hands
npm.cmd ci
npm.cmd run dev
```

Open the URL printed by Vite. The app can still demonstrate the two-device conversation in two tabs when the AI service is unavailable.

## Run with camera recognition and a second device

Create a virtual environment using a supported Python version, then install the requirements:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm.cmd run dev:ai
npm.cmd run dev:clinic
```

`dev:clinic` uses HTTPS and listens on the local network so phone browsers can use the camera and microphone. Accept Vite's local development certificate warning on the patient device. The doctor creates a four-digit room code; the patient opens the displayed LAN address and joins it.

## Checks

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
```

The Node test command exercises the character animation and does not require Bun. Python tests require the AI virtual environment and can be run with:

```powershell
.\.venv\Scripts\python.exe -m pytest tests pytests -q
```

## Useful scripts

| Command | Purpose |
| --- | --- |
| `npm.cmd run dev` | Start the local Vite app |
| `npm.cmd run dev:ai` | Start FastAPI on port 8000 |
| `npm.cmd run dev:clinic` | Start HTTPS Vite for local-network devices |
| `npm.cmd run dev:all` | Start the local AI service and Vite together |

In PowerShell environments that block `npm.ps1`, use `npm.cmd` as shown above.
