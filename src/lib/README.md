# Zebra Scanner & Printer Library

A TypeScript library for Zebra barcode scanning and printing on Android devices using Capacitor.

## Installation

```bash
npm install @capacitor/core @capacitor/android
```

Copy the `src/lib/` folder to your project or install as a local package.

## Quick Start

```typescript
import { useZebra, quickBarcode } from '@/lib';

function App() {
  const { barcodes, printZPL, isConnected } = useZebra();
  
  // Print a simple barcode label
  const handlePrint = () => printZPL(quickBarcode('ABC123'));
  
  return <button onClick={handlePrint}>Print</button>;
}
```

---

## Architecture Overview

```mermaid
graph TB
    subgraph "Application Layer"
        APP[React Component]
    end
    
    subgraph "Library Layer"
        HOOKS[React Hooks<br/>useZebra, useZebraScanner, useZebraPrinter]
        ZPL[ZPL Generator<br/>quickBarcode, ZPLBuilder]
        PLUGIN[Plugin Wrapper<br/>ZebraPlugin]
        TYPES[Type Definitions]
        UTILS[Utilities]
    end
    
    subgraph "Native Layer"
        CAP[Capacitor Runtime]
        ANDROID[Android Plugin<br/>ZebraPlugin.java]
        ZEBRA_SDK[Zebra Link-OS SDK]
        DATAWEDGE[DataWedge]
    end
    
    subgraph "Hardware"
        SCANNER[Zebra Scanner]
        PRINTER[Zebra Printer]
    end
    
    APP --> HOOKS
    APP --> ZPL
    HOOKS --> PLUGIN
    HOOKS --> TYPES
    ZPL --> TYPES
    PLUGIN --> CAP
    CAP --> ANDROID
    ANDROID --> ZEBRA_SDK
    ANDROID --> DATAWEDGE
    DATAWEDGE --> SCANNER
    ZEBRA_SDK --> PRINTER
```

---

## Sequence Diagrams

### 1. Initialization Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant Hook as useZebra()
    participant Plugin as ZebraPlugin
    participant Native as Native Plugin
    participant HW as Hardware Check
    
    App->>Hook: Component mounts
    Hook->>Plugin: initialize()
    Plugin->>Native: initialize()
    Native->>HW: Check if Zebra device
    HW-->>Native: { isZebraDevice: true/false }
    
    alt Zebra Device
        Native->>HW: Check Zebra SDK
        HW-->>Native: { sdkAvailable: true }
        Native->>HW: Check DataWedge
        HW-->>Native: { dataWedgeAvailable: true }
    else Non-Zebra Device
        Native-->>Native: Enable demo mode
    end
    
    Native-->>Plugin: InitResult
    Plugin-->>Hook: InitResult
    Hook-->>App: { isInitialized, isZebraDevice }
    
    Note over Hook,Native: Register barcode listener
    Hook->>Plugin: addListener('barcodeScanned')
    Plugin->>Native: addListener('barcodeScanned')
    Native-->>Plugin: { success: true }
```

### 2. Barcode Scanning Flow

```mermaid
sequenceDiagram
    participant User as User
    participant App as Application
    participant Hook as useZebra()
    participant Plugin as ZebraPlugin
    participant Native as Native Plugin
    participant DW as DataWedge
    participant Scanner as Zebra Scanner
    
    App->>Hook: toggleScanning()
    Hook->>Plugin: startScanning()
    Plugin->>Native: startScanning()
    
    alt Zebra Device
        Native->>DW: Enable scanning profile
        DW->>Scanner: Activate scanner
    else Demo Mode
        Native->>Native: Start demo interval
    end
    
    Native-->>Plugin: { success: true }
    Plugin-->>Hook: isScanning = true
    Hook-->>App: State updated
    
    User->>Scanner: Point at barcode
    Scanner->>DW: Barcode detected
    DW->>Native: Intent broadcast
    Native->>Native: Parse barcode data
    Native-->>Plugin: Event: barcodeScanned
    Plugin-->>Hook: Callback triggered
    Hook->>Hook: Update barcodes array
    Hook-->>App: { barcodes: [...new] }
    
    Note over App: onBarcodeScanned() called
```

### 3. Printing Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant Hook as useZebraPrinter()
    participant ZPL as quickBarcode()
    participant Plugin as ZebraPlugin
    participant Native as Native Plugin
    participant SDK as Zebra Link-OS SDK
    participant Printer as Zebra Printer
    
    Note over App: Generate ZPL
    App->>ZPL: quickBarcode('ABC123')
    ZPL-->>App: "^XA^CI28^FO50,30..."
    
    Note over App: Connect to printer
    App->>Hook: connect({ address: '192.168.1.100' })
    Hook->>Plugin: connectPrinter(options)
    Plugin->>Native: connectPrinter(options)
    Native->>SDK: getConnection(address)
    SDK->>Printer: TCP/BT Connection
    Printer-->>SDK: Connected
    SDK-->>Native: Connection established
    Native-->>Plugin: { success: true }
    Plugin-->>Hook: isConnected = true
    Hook-->>App: Printer connected
    
    Note over App: Print ZPL
    App->>Hook: printZPL(zpl)
    Hook->>Plugin: printZPL({ zpl })
    Plugin->>Native: printZPL({ zpl })
    Native->>SDK: sendZPL(zpl)
    SDK->>Printer: Send ZPL data
    Printer-->>SDK: Print complete
    SDK-->>Native: Success
    Native-->>Plugin: { success: true }
    Plugin-->>Hook: Print complete
    Hook-->>App: { isPrinting: false }
```

### 4. Complete Print Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Component
    participant H as useZebra Hook
    participant P as ZebraPlugin
    participant N as Android Native
    participant Z as Zebra SDK
    participant PR as Printer
    
    U->>C: Click "Print"
    C->>C: quickBarcode('12345')
    C-->>C: zpl = "^XA^CI28..."
    
    alt Not Connected
        C->>H: connect({ address })
        H->>P: connectPrinter()
        P->>N: connectPrinter()
        N->>Z: getConnection()
        Z->>PR: TCP Connect
        PR-->>Z: ACK
        Z-->>N: Connected
        N-->>H: { success: true }
    end
    
    C->>H: printZPL(zpl)
    H->>P: printZPL({ zpl })
    P->>N: printZPL({ zpl })
    
    loop For each copy
        N->>Z: sendZPL(zpl)
        Z->>PR: Stream ZPL
        PR->>PR: Print label
        PR-->>Z: Complete
        Z-->>N: Success
    end
    
    N-->>H: { success: true }
    H-->>C: Print done
    C-->>U: Show success message
```

---

## API Reference

### React Hooks

#### `useZebra(options?)`

Combined hook for scanner and printer.

```typescript
const {
  // Scanner
  barcodes,          // BarcodeResult[]
  isScanning,        // boolean
  toggleScanning,    // () => Promise<void>
  clearBarcodes,     // () => void
  
  // Printer
  printers,          // PrinterInfo[]
  connect,           // (options) => Promise<boolean>
  disconnect,        // () => Promise<void>
  printZPL,          // (zpl: string) => Promise<boolean>
  isConnected,       // boolean
  connectedPrinter,  // PrinterInfo | null
  
  // General
  isInitialized,     // boolean
  isZebraDevice,     // boolean
  error,             // string | null
} = useZebra({
  autoStartScanning: false,
  autoDiscoverPrinters: true,
  onBarcodeScanned: (barcode) => console.log(barcode.data),
  onError: (error) => console.error(error),
});
```

#### `useZebraScanner(options?)`

Scanner-only hook.

```typescript
const {
  barcodes,
  isScanning,
  startScanning,
  stopScanning,
  toggleScanning,
  clearBarcodes,
  isInitialized,
} = useZebraScanner({
  maxBarcodeHistory: 50,
  onBarcodeScanned: (barcode) => {},
});
```

#### `useZebraPrinter(options?)`

Printer-only hook.

```typescript
const {
  printers,
  connectedPrinter,
  isConnected,
  isPrinting,
  status,
  discoverPrinters,
  connect,
  disconnect,
  print,
  printZPL,
} = useZebraPrinter({
  autoDiscoverPrinters: true,
  onPrinterConnected: (printer) => {},
});
```

---

### ZPL Generation

#### Quick Functions

```typescript
import { quickBarcode, quickBarcodeLabel } from '@/lib';

// Simplest - just pass barcode text
const zpl = quickBarcode('ABC123');
// ^XA^CI28^FO50,30^BCN,100,Y,N,N^FDABC123^FS^XZ

// With options
const zpl = quickBarcodeLabel('ABC123', {
  x: 50,
  y: 30,
  height: 80,
  showText: true,
});
```

#### ZPLBuilder Class

```typescript
import { ZPLBuilder } from '@/lib';

const zpl = new ZPLBuilder({ width: 4, height: 2 })
  .text(50, 30, 'Product Name', { font: 'D', fontHeight: 30 })
  .barcode128(50, 80, 'ABC123', { height: 80, printText: true })
  .qrcode(400, 80, 'https://example.com', { size: 6 })
  .box(30, 200, 540, 2, 2)
  .build();
```

#### Pre-built Templates

```typescript
import { LABEL_TEMPLATES, generateFromTemplate } from '@/lib';

// Generate using template ID
const zpl = generateFromTemplate('product-label', {
  barcode: '123456789',
  productName: 'Widget',
  price: '$9.99',
  sku: 'WGT-001',
});
```

---

### Plugin Direct Access

```typescript
import { ZebraPlugin } from '@/lib';

// Initialize
const result = await ZebraPlugin.initialize();

// Add barcode listener
await ZebraPlugin.addBarcodeListener((barcode) => {
  console.log('Scanned:', barcode.data);
});

// Start scanning
await ZebraPlugin.startScanning();

// Connect and print
await ZebraPlugin.connectPrinter({ address: '192.168.1.100:9100' });
await ZebraPlugin.printZPL(quickBarcode('ABC123'));
```

---

## Types

```typescript
interface BarcodeResult {
  data: string;           // Decoded barcode string
  symbology: string;      // CODE128, EAN-13, QR, etc.
  timestamp: number;      // Unix timestamp
  isSpecialZebra: boolean; // Zebra config barcode
  rawBytes?: number[];    // Raw bytes from scanner
}

interface PrinterInfo {
  name: string;
  address: string;        // MAC or IP:PORT
  type: 'bluetooth' | 'wifi' | 'usb';
  isOnline: boolean;
}

interface PrinterStatus {
  isReady: boolean;
  isPaused: boolean;
  isHeadOpen: boolean;
  isPaperOut: boolean;
  isRibbonOut: boolean;
  messages: string[];
}

interface PrintOptions {
  content: string;
  format?: 'text' | 'zpl' | 'cpcl' | 'pdf' | 'image';
  copies?: number;
  width?: number;
  height?: number;
}

interface InitResult {
  success: boolean;
  message: string;
  isZebraDevice?: boolean;
  sdkAvailable?: boolean;
  dataWedgeAvailable?: boolean;
}
```

---

## Demo Mode

The library automatically detects non-Zebra devices and runs in demo mode:

```mermaid
flowchart TD
    A[App Starts] --> B{Is Zebra Device?}
    B -->|Yes| C[Use Native SDK]
    B -->|No| D[Demo Mode]
    
    C --> E[Real Scanning via DataWedge]
    C --> F[Real Printing via Link-OS SDK]
    
    D --> G[Simulated Scans<br/>every 3-5 seconds]
    D --> H[ZPL logged to console<br/>Simulated connection]
    
    E --> I[Real Barcodes]
    G --> J[Demo Barcodes<br/>DEMO-123456789, etc.]
```

Demo mode features:
- Simulated barcode scans every 3-5 seconds
- Mock printer discovery
- ZPL logged to console instead of printing
- All hooks and APIs work identically

---

## Project Structure

```
src/lib/
├── index.ts           # Main exports
├── types/
│   └── index.ts       # TypeScript interfaces
├── hooks/
│   └── index.ts       # React hooks
│       ├── useZebraScanner()
│       ├── useZebraPrinter()
│       └── useZebra()
├── zpl/
│   └── generator.ts   # ZPL generation
│       ├── quickBarcode()
│       ├── ZPLBuilder class
│       └── LABEL_TEMPLATES
├── plugin/
│   └── index.ts       # Capacitor plugin wrapper
└── utils/
    └── index.ts       # Helper utilities
```

---

## Troubleshooting

### Barcode listener not working

```typescript
// Make sure to await the listener registration
await ZebraPlugin.addBarcodeListener(callback);
await ZebraPlugin.startScanning();
```

### Printer not connecting

1. Check printer is powered on
2. Verify address format:
   - WiFi: `192.168.1.100:9100`
   - Bluetooth: `00:11:22:33:44:55`
3. Ensure Bluetooth permissions granted

### Demo mode on Zebra device

Check `initResult.isZebraDevice`:
```typescript
const { initResult } = useZebra();
console.log('Zebra device:', initResult?.isZebraDevice);
```

---

## License

MIT
