# Zebra Scanner & Printer — Next.js + Capacitor Integration

A reference implementation for integrating **Zebra barcode scanners and ZPL label printers** into a Next.js app using Capacitor for Android deployment. Built to serve as a practical example for similar hardware integrations.

---

## What This Demonstrates

- **Capacitor plugin architecture** — how to bridge native Android (Java) functionality to a Next.js web app
- **Hardware abstraction with graceful fallback** — the app works on Zebra devices, any Android device, and in a browser
- **Barcode scanning** via Zebra DataWedge (hardware trigger), Bluetooth Scanner SDK, or device camera (html5-qrcode)
- **ZPL label printing** via Zebra Link-OS SDK (Bluetooth/USB) or TCP socket over WiFi (port 9100)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web Framework | Next.js 16 (App Router) |
| Android Bridge | Capacitor 8 |
| Camera Scanning | html5-qrcode |
| Native SDK (Scanner) | Zebra Scanner SDK (`barcode_scanner_library.aar`) |
| Native SDK (Printer) | Zebra Link-OS SDK (`ZSDK_ANDROID_API.jar`) |
| Language | TypeScript |

---

## Project Structure

```
zebra/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Main UI (scanning + printer controls)
│   │   ├── layout.tsx              # Root layout with metadata
│   │   └── globals.css             # Global styles
│   │
│   ├── lib/                        # Reusable service layer
│   │   ├── index.ts                # Public exports
│   │   ├── scanner.service.ts      # Scanner abstraction (Zebra → Camera fallback)
│   │   └── printer.service.ts      # Printer abstraction (ZPL printing)
│   │
│   └── plugins/
│       └── zebra/
│           ├── index.ts            # Capacitor plugin interface (TypeScript types)
│           ├── web.ts              # Browser mock / demo mode implementation
│           └── camera-scanner.ts   # html5-qrcode camera scanner wrapper
│
├── android/
│   └── app/
│       ├── libs/
│       │   ├── barcode_scanner_library.aar  # Zebra Scanner SDK
│       │   └── ZSDK_ANDROID_API.jar         # Zebra Link-OS SDK
│       └── src/main/java/com/zebra/app/plugins/
│           ├── ZebraPlugin.java              # Main Capacitor plugin
│           ├── ZebraConfig.java              # Centralised config constants
│           ├── ScannerSDKHelper.java         # Bluetooth Scanner SDK wrapper
│           └── LinkOSHelper.java             # Link-OS Printer SDK wrapper
│
├── capacitor.config.ts             # Capacitor config (appId: com.zebra.app)
└── package.json
```

---

## Service Layer

The `src/lib/` directory is the integration core. It exposes clean service classes that can be imported into any component.

### `ScannerService`

Initialises the best available scanner and abstracts the differences away.

```ts
import { ScannerService, type BarcodeResult, type ScannerMode } from '@/lib';

const scanner = new ScannerService();
const result = await scanner.initialize(); // result.isZebraDevice, result.message

scanner.onScan((barcode: BarcodeResult) => {
  console.log(barcode.data, barcode.symbology, barcode.source);
});

await scanner.start();  // starts scanning (Zebra DataWedge or camera)
await scanner.stop();
await scanner.destroy(); // cleanup listeners and camera
```

**Scanner priority chain:**
```
initialize()
  ├── ZebraPlugin.initialize() → isZebraDevice?  →  DataWedge (hardware trigger)
  └── fallback → CameraScanner (html5-qrcode)
```

**`BarcodeResult` shape:**
```ts
interface BarcodeResult {
  data: string;       // scanned value
  symbology: string;  // e.g. "CODE_128", "QR_CODE"
  timestamp: number;
  source?: string;    // "zebra" | "camera"
}
```

**Supported camera barcode formats:**
`CODE_128`, `CODE_39`, `EAN_13`, `EAN_8`, `QR_CODE`, `UPC_A`, `UPC_E`

---

### `PrinterService`

Wraps ZPL printing. Discovers printers on the network/Bluetooth and sends raw ZPL.

```ts
import { PrinterService, type PrinterInfo } from '@/lib';

const printer = new PrinterService();

// Discover printers
const printers: PrinterInfo[] = await printer.discover();

// Connect by address ("192.168.1.100:9100" for WiFi, MAC for Bluetooth)
const connected = await printer.connect('192.168.1.100:9100');

// Print a barcode label (generates ZPL automatically)
await printer.printBarcode('SKU-12345');

// Print a test label
await printer.printTestLabel();

// Disconnect
await printer.disconnect();
```

**`PrinterInfo` shape:**
```ts
interface PrinterInfo {
  name: string;
  address: string; // IP:port or Bluetooth MAC
}
```

---

## Capacitor Plugin Interface

The plugin bridge is defined in `src/plugins/zebra/index.ts` and registered via `registerPlugin<ZebraPlugin>('ZebraPlugin')`.

### Scanner Methods

| Method | Returns | Description |
|---|---|---|
| `initialize()` | `InitResult` | Detects device type, initialises DataWedge profile |
| `startScanning()` | `{ success, mode, scannerName }` | Starts active scanning |
| `stopScanning()` | `{ success }` | Stops scanning |
| `discoverScanners()` | `{ scanners: ScannerInfo[] }` | Lists paired Bluetooth scanners |
| `connectScanner({ scannerId })` | `{ success }` | Connects a Bluetooth scanner |
| `disconnectScanner()` | `{ success }` | Disconnects active Bluetooth scanner |
| `isScannerConnected()` | `{ connected, sdkAvailable }` | Connection status check |

### Printer Methods

| Method | Returns | Description |
|---|---|---|
| `discoverPrinters()` | `{ printers: PrinterInfo[] }` | Network + Bluetooth discovery |
| `connectPrinter({ address })` | `{ success }` | Connect to printer by address |
| `disconnectPrinter()` | `{ success }` | Disconnect current printer |
| `printZPL({ zpl })` | `{ success }` | Send raw ZPL to connected printer |
| `isPrinterConnected()` | `{ connected }` | Check printer connection |
| `getPrinterStatus()` | `{ isReady, isPaused, isHeadOpen, isPaperOut, isRibbonOut }` | Link-OS status (Bluetooth/USB only) |

### Events

| Event | Payload |
|---|---|
| `barcodeScanned` | `{ data, symbology, timestamp, source }` |

---

## Browser / Demo Mode

`src/plugins/zebra/web.ts` implements the full plugin interface for browser use. It is registered automatically when Capacitor native plugins are not detected.

**Demo behaviour:**
- `initialize()` → returns `isZebraDevice: false`
- `startScanning()` → emits a random barcode every 3 seconds
- `discoverPrinters()` → returns a fake `127.0.0.1:9100` entry
- `connectPrinter()` / `printZPL()` → simulate success with a 500ms delay
- Bluetooth scanner methods → return `success: false`

This means the app is fully testable in a web browser without any hardware.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Android Studio (for Android builds)
- Android SDK 22+ targeting Android 5.1+

### Run in browser (demo mode)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app runs in demo mode — barcodes are simulated and printer calls are mocked.

### Build and deploy to Android

```bash
npm run build          # builds Next.js static export
npm run cap:sync       # syncs web assets to Android project
npm run cap:open       # opens Android Studio
```

Or in one step:

```bash
npm run android        # build + sync + open Android Studio
npm run android:run    # build + sync + deploy to connected device
```

### Capacitor Config (`capacitor.config.ts`)

```ts
{
  appId: 'com.zebra.app',
  appName: 'Zebra App',
  webDir: 'out',              // Next.js static export output
  android: {
    allowMixedContent: true,  // required for TCP socket printing
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
}
```

---

## Android Permissions

Add these to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Camera scanning -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Bluetooth (Android 12+) -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- WiFi printing -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

Also set `android:usesCleartextTraffic="true"` on the `<application>` tag for TCP socket printing over unencrypted WiFi.

---

## Adapting This for Other Integrations

This project is structured to be a starting point. Here is where to make changes:

| Goal | Where to change |
|---|---|
| Add a new native feature | `ZebraPlugin.java` (Android), `src/plugins/zebra/index.ts` (types), `src/plugins/zebra/web.ts` (mock) |
| Add a new service abstraction | `src/lib/` — follow the pattern in `scanner.service.ts` |
| Change app ID / package name | `capacitor.config.ts` and Android manifest |
| Add new ZPL label templates | `src/lib/printer.service.ts` — add a new `printXxx()` method |
| Use in another Next.js project | Copy `src/lib/` and `src/plugins/zebra/` into the target project |

---

## License

MIT
