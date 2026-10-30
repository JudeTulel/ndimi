# Ndimi

Ndimi is a mobile-first, offline-capable Expo + React Native app for English and Swahili communication. It combines instant translation, voice transcription, local history, and a lightweight on-device assistant to help users interact more naturally across language barriers.

The app is designed for Android-first use, with a polished mobile UI and a privacy-first architecture that keeps translation and assistant workflows local whenever possible.

## Why Ndimi

- Translate text between English and Swahili
- Transcribe and translate spoken audio locally
- Keep recent translations in history for quick reuse
- Manage local language models inside the app
- Use a chat/agent experience for simple tasks and assistance
- Prioritize mobile usability, offline readiness, and device privacy

## Features

### Text translation
- Fast source/target language switching
- English ↔ Swahili translation flow
- Recent results surfaced in the home experience
- Local result history with searchable saved entries

### Voice translation
- Microphone-driven speech input
- Recording flow for transcription and translation
- Built to work with device-side inference models
- Clear loading, recording, and result states

### Offline model management
- Model setup via the in-app settings flow
- Support for local model status checks and readiness indicators
- Model-specific configuration for translation and assistant use

### Assistant experience
- Chat mode for open-ended questions
- Agent mode for task-oriented actions and mobile interactions
- Supports connected-device and on-device workflows depending on the runtime state

### History and settings
- Saved translation records
- Per-user settings, model configuration, and connection flows
- App setup and permission flows for first-run experience

## Tech stack

- Expo SDK 54
- React Native 0.81.5
- React 19
- Expo Router
- TypeScript
- SQLite for local storage
- Native audio, camera, and permissions support via Expo modules
- QVAC / on-device inference integration for local model workflows

## Repository structure

```text
ndimi/
├── app.json
├── assets/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── camera.tsx
│   │   ├── history.tsx
│   │   ├── index.tsx
│   │   ├── translate.tsx
│   │   ├── voice.tsx
│   │   ├── onboarding/
│   │   └── settings/
│   ├── components/
│   ├── core/
│   ├── features/
│   ├── theme/
│   └── types/
├── global.css
├── package.json
├── tsconfig.json
├── qvac.config.json
├── eslint.config.js
├── README.md
└── ...
```

## Getting started

### Prerequisites

- Node.js
- Expo CLI / React Native toolchain
- Android device or emulator for local testing
- Optional: a physical device for validating native model runtime behavior

### Install dependencies

```bash
npm install
```

### Start the app

```bash
npx expo start
```

### Run on Android

```bash
npx expo run:android
```

### Run on iOS

```bash
npx expo run:ios
```

## Local model and runtime notes

This project is built around optional local inference and model installation. Some features work best only after the required translation and speech models are available and validated on-device.

The app includes model configuration and settings screens for this workflow, and the project architecture explicitly targets:

- local-first inference
- privacy-preserving processing
- on-device model lifecycle management
- mobile-friendly performance characteristics

## App permissions and platform behavior

The app is configured for mobile permissions including:

- microphone access for voice capture
- camera access for document/image-based translation flows
- contacts access for assistant interactions
- SMS and phone permissions for device-level actions

These are declared in `app.json` and should be reviewed before release or testing on a physical device.

## Development scripts

```bash
npx expo start
npx expo run:android
npx expo run:ios
npx expo lint
npx tsc --noEmit
```

## Privacy and offline-first approach

Ndimi is designed around a local-first workflow:

- translation and speech processing prefer device-local execution
- model installs are user-driven and app-managed
- history and preferences are stored locally
- the app is intended to remain useful even when the network is unavailable after model setup

## Project status

This repository is actively oriented toward a local, mobile-first translation assistant for English/Swahili workflows. It currently includes the main app shell, translation and voice interfaces, settings, model management, and history features, with architecture aligned for native/local inference and future model reliability improvements.

## License

This project does not currently declare a license in the root repository metadata. If you plan to distribute it publicly, add a license file and document the intended usage terms.

## Contributing

Contributions are welcome. For larger changes, start by reviewing the app architecture and model-related flows before editing runtime logic or native configuration.

## Acknowledgements

- Expo
- React Native
- QVAC / local inference tooling
- The mobile-first Swahili translation and assistance workflow powering Ndimi
