# Zebra Scanner & Printer App

A Next.js application with Capacitor for Android, integrated with Zebra SDK for barcode scanning and printing on Zebra devices.

## Features

- **Barcode Scanning**: Uses Zebra DataWedge for hardware barcode scanning on Zebra devices
- **Special Zebra Barcode Detection**: Automatically detects special Zebra configuration barcodes
- **Printing**: Supports Zebra printers via Bluetooth, WiFi, and USB
- **ZPL Support**: Direct ZPL (Zebra Programming Language) printing
- **Label Templates**: Pre-built label templates for common use cases
- **Cross-platform**: Web version with demo mode for testing without a Zebra device

## Project Structure

```
zebra/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── page.tsx         # Main application UI
│   │   ├── layout.tsx       # Root layout
│   │   └── globals.css      # Styles
│   ├── lib/                 # 📚 Reusable library modules
│   │   ├── index.ts         # Main library exports
│   │   ├── types/           # TypeScript type definitions
│   │   ├── hooks/           # React hooks (useZebraScanner, useZebraPrinter)
│   │   ├── zpl/             # ZPL generator (ZPLBuilder, templates)
│   │   ├── plugin/          # Capacitor plugin wrapper
│   │   └── utils/           # Utility functions
│   └── plugins/
│       └── zebra/           # Capacitor plugin TypeScript interface
│           ├── index.ts     # Plugin interface definitions
│           └── web.ts       # Web mock implementation
├── android/                 # Capacitor Android project
│   └── app/src/main/java/com/zebra/app/
│       ├── MainActivity.java
│       └── plugins/
│           └── ZebraPlugin.java  # Android native implementation
├── capacitor.config.ts
├── package.json
└── README.md
```

## Library Modules

The `src/lib/` directory contains reusable modules that can be easily ported to other projects:

### 1. Types (`src/lib/types/`)
TypeScript interfaces for all operations:
- `BarcodeResult` - Scanned barcode data
- `PrinterOptions`, `PrinterInfo`, `PrinterStatus` - Printer types
- `PrintOptions`, `LabelConfig` - Print configuration
- `InitResult` - SDK initialization result

### 2. React Hooks (`src/lib/hooks/`)
Easy-to-use React hooks:

```tsx
import { useZebraScanner, useZebraPrinter, useZebra } from '@/lib';

// Scanner only
const { barcodes, isScanning, startScanning, stopScanning } = useZebraScanner();

// Printer only
const { printers, connect, printZPL, isConnected } = useZebraPrinter();

// Combined (recommended)
const { 
  barcodes, isScanning, startScanning,
  printers, connect, printZPL, isConnected,
  isZebraDevice 
} = useZebra({
  autoStartScanning: true,
  autoDiscoverPrinters: true,
  onBarcodeScanned: (barcode) => console.log('Scanned:', barcode.data)
});
```

### 3. ZPL Generator (`src/lib/zpl/`)
Fluent ZPL builder and templates:

```tsx
import { ZPL, ZPLBuilder, createProductLabel } from '@/lib';

// Using the builder
const zpl = new ZPLBuilder({ width: 4, height: 2 })
  .text(50, 30, 'Product Name', { font: 'D', fontHeight: 30 })
  .barcode(50, 80, 'CODE128', 'ABC123', { height: 80, printText: true })
  .qrcode(400, 80, 'https://example.com', { model: 2, size: 6 })
  .build();

// Using convenience methods
const simpleZpl = ZPL.barcode('123456789', { height: 100 });
const textZpl = ZPL.text('Hello World', { font: 'D', size: 24 });

// Using factory functions
const productZpl = createProductLabel({
  barcode: '123456789',
  productName: 'Widget',
  sku: 'WGT-001',
  price: '$9.99'
});
```

### 4. Plugin Wrapper (`src/lib/plugin/`)
Direct plugin access:

```tsx
import { ZebraPlugin } from '@/lib';

// Initialize
const result = await ZebraPlugin.initialize();

// Add barcode listener
await ZebraPlugin.addBarcodeListener((barcode) => {
  console.log('Scanned:', barcode.data, barcode.symbology);
});

// Start scanning
await ZebraPlugin.startScanning();

// Connect and print
await ZebraPlugin.connectPrinter({ address: '192.168.1.100:9100' });
await ZebraPlugin.printZPL('^XA^FO50,50^ADN,36,20^FDHello^FS^XZ');
```

### 5. Utilities (`src/lib/utils/`)
Helper functions:
- Device detection: `isZebraDevice()`, `getDeviceInfo()`
- Barcode validation: `validateBarcode()`, `detectSymbology()`
- Unit conversion: `mmToDots()`, `inchesToDots()`
- ZPL helpers: `escapeZPL()`, `estimatePrintTime()`

## Quick Start

### 1. Install Dependencies

```bash
cd zebra
npm install
```

### 2. Run Development Server (Web Demo Mode)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

In web demo mode:
- The scanner simulates barcode scans every 3-5 seconds
- Printer connections are simulated
- All functionality works in demo mode

### 3. Build for Android

```bash
# Build Next.js project
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

### 4. Run on Android Device

From Android Studio:
1. Connect your Android device (Zebra or non-Zebra)
2. Select your device from the dropdown
3. Click Run (green play button)

Or via command line:
```bash
npx cap run android
```

## Zebra SDK Setup (For Full Functionality on Zebra Devices)

### Option 1: Using Maven Dependencies (Recommended)

The app is configured to use Zebra SDK from Maven/JitPack. The DataWedge integration works out of the box on Zebra devices.

### Option 2: Manual SDK Installation

If Maven dependencies fail to download:

1. Download the Zebra Link-OS SDK from [Zebra's developer portal](https://www.zebra.com/us/en/support-downloads/printer-software/link-os/sdk.html)

2. Copy the following JAR files to `android/app/libs/`:
   - `ZebraPrinter.jar`
   - `ZebraCard.jar` (optional)

3. The build.gradle is configured to include JAR files from the libs folder.

### DataWedge Configuration

On Zebra devices, DataWedge should be pre-installed. The app automatically:
- Creates a DataWedge profile named "ZebraApp"
- Configures intent output for barcode scanning
- Associates the profile with the app

If scanning doesn't work:
1. Open DataWedge app on the Zebra device
2. Check that "ZebraApp" profile exists and is enabled
3. Verify the profile is associated with com.zebra.app

## App Features

### Barcode Scanning

- **Start/Stop Scanning**: Toggle the scanner with the main button
- **Scan History**: View up to 50 recently scanned barcodes
- **Special Barcode Detection**: Zebra configuration barcodes are highlighted
- **Quick Actions**: Copy barcode to clipboard or use for printing

### Label Printing

Four pre-built label templates:

1. **Simple Barcode**: Basic barcode with text below (2" x 1")
2. **Product Label**: Product name, barcode, SKU, and price (3" x 2")
3. **Inventory Label**: Inventory tracking with item and quantity (4" x 2")
4. **Shipping Label**: Large shipping label with tracking (4" x 6")

### Custom ZPL

Print custom ZPL code directly with:
- ZPL editor with syntax preview
- Quick reference guide
- Template ZPL import option

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Sync with Android
npm run cap:sync

# Open Android Studio
npm run cap:open

# Build and open Android
npm run android

# Build and run on device
npm run android:run
```

## API Reference

### ZebraPlugin Methods

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize the Zebra SDK |
| `startScanning()` | Start barcode scanner |
| `stopScanning()` | Stop barcode scanner |
| `addListener(event, callback)` | Add event listener |
| `connectPrinter(options)` | Connect to a printer |
| `disconnectPrinter()` | Disconnect from printer |
| `print(options)` | Print content |
| `printZPL({ zpl })` | Print ZPL commands |
| `discoverPrinters()` | Discover available printers |
| `isPrinterConnected()` | Check printer connection |
| `getPrinterStatus()` | Get printer status |

### Events

| Event | Description |
|-------|-------------|
| `barcodeScanned` | Fired when a barcode is scanned |
| `printerDiscovered` | Fired when a printer is discovered |

## Troubleshooting

### DataWedge not working

1. Ensure DataWedge is enabled on the Zebra device
2. Check that the app has camera permissions
3. Manually create a DataWedge profile for the app:
   - Profile name: ZebraApp
   - Associated app: com.zebra.app
   - Intent output action: com.zebra.app.SCAN
   - Intent delivery: Broadcast

### Printer connection issues

1. Ensure Bluetooth permissions are granted
2. Check that the printer is powered on and in range
3. Verify the printer address:
   - Bluetooth: MAC address (e.g., 00:11:22:33:44:55)
   - WiFi: IP:PORT (e.g., 192.168.1.100:9100)
4. For Bluetooth, ensure the printer is paired in Android settings

### Build errors

1. Clean the Android project:
   ```bash
   cd android && ./gradlew clean
   ```
2. Sync Capacitor:
   ```bash
   npx cap sync android
   ```
3. Check that Zebra SDK files are available

### App crashes on startup

1. Check logcat for errors:
   ```bash
   adb logcat | grep ZebraPlugin
   ```
2. Ensure all required permissions are granted
3. Try uninstalling and reinstalling the app

## Requirements

- Node.js 18+
- Android Studio (for Android development)
- Zebra Android device (for hardware scanning)
- Zebra printer (for printing functionality)
- Android SDK 22+ (Android 5.1+)

## Demo Mode

The app works in demo mode when:
- Running in a web browser
- Running on a non-Zebra Android device
- Zebra SDK is not available

In demo mode:
- Barcode scanning is simulated
- Printer connections are simulated
- ZPL is logged to console instead of printing

## License

MIT
