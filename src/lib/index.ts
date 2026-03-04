/**
 * @fileoverview Zebra Scanner & Printer Library
 * @module zebra-lib
 * 
 * A comprehensive TypeScript library for Zebra barcode scanning and printing
 * on Android devices using Capacitor.
 * 
 * @description
 * This library provides:
 * - React hooks for easy integration (`useZebraScanner`, `useZebraPrinter`, `useZebra`)
 * - ZPL generation utilities (`ZPLBuilder`, `LabelTemplate`)
 * - Type definitions for all operations
 * - Capacitor plugin wrapper for native functionality
 * 
 * @example Basic Usage
 * ```tsx
 * import { useZebra, ZPL } from '@/lib';
 * 
 * function App() {
 *   const { barcodes, isScanning, startScanning, printZPL, isConnected } = useZebra({
 *     autoStartScanning: true,
 *     onBarcodeScanned: (barcode) => console.log('Scanned:', barcode.data)
 *   });
 *   
 *   const handlePrint = async () => {
 *     const zpl = ZPL.builder()
 *       .barcode(50, 50, 'CODE128', barcodes[0].data)
 *       .text(50, 150, 'Product Label')
 *       .build();
 *     
 *     await printZPL(zpl);
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handlePrint} disabled={!isConnected}>
 *         Print Label
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example ZPL Generation
 * ```typescript
 * import { ZPL, LabelTemplates } from '@/lib';
 * 
 * // Using builder pattern
 * const zpl = ZPL.builder({ width: 4, height: 2 })
 *   .text(50, 30, 'Product Name', { font: 'D', fontHeight: 30 })
 *   .barcode(50, 80, 'CODE128', 'ABC123', { height: 80, printText: true })
 *   .qrcode(400, 80, 'https://example.com', { model: 2, size: 6 })
 *   .box(30, 200, 540, 2, 2)
 *   .build();
 * 
 * // Using templates
 * const label = LabelTemplates.productLabel({
 *   barcode: '123456789',
 *   productName: 'Widget',
 *   price: '$9.99'
 * });
 * ```
 * 
 * @example Direct Plugin Access
 * ```typescript
 * import { ZebraPlugin } from '@/lib';
 * 
 * // Initialize
 * const result = await ZebraPlugin.initialize();
 * 
 * if (result.success) {
 *   // Add listener
 *   await ZebraPlugin.addBarcodeListener((barcode) => {
 *     console.log('Scanned:', barcode.data, barcode.symbology);
 *   });
 *   
 *   // Start scanning
 *   await ZebraPlugin.startScanning();
 *   
 *   // Connect to printer
 *   await ZebraPlugin.connectPrinter({ address: '192.168.1.100:9100' });
 *   
 *   // Print
 *   await ZebraPlugin.printZPL('^XA^FO50,50^ADN,36,20^FDHello^FS^XZ');
 * }
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Initialization
  InitResult,
  
  // Barcode
  BarcodeResult,
  BarcodeSymbology,
  
  // Printer
  PrinterConnectionType,
  PrinterOptions,
  PrinterInfo,
  PrinterStatus,
  
  // Print
  PrintFormat,
  PrintOptions,
  PrintResult,
  
  // ZPL
  LabelUnit,
  LabelConfig,
  FieldOrigin,
  BarcodeFieldOptions,
  TextFieldOptions,
  QRCodeFieldOptions,
  BoxFieldOptions,
  LabelData,
  LabelTemplate,
} from './types';

// ============================================================================
// HOOKS
// ============================================================================

export {
  // Scanner hook
  useZebraScanner,
  
  // Printer hook
  useZebraPrinter,
  
  // Combined hook
  useZebra,
} from './hooks';

export type {
  ScannerState,
  ScannerActions,
  PrinterState,
  PrinterActions,
  UseZebraScannerReturn,
  UseZebraPrinterReturn,
  UseZebraOptions,
} from './hooks';

// ============================================================================
// ZPL GENERATOR
// ============================================================================

export {
  // Builder class
  ZPLBuilder,
  
  // Quick functions (simplest to use)
  quickBarcode,
  quickBarcodeLabel,
  
  // Factory functions
  createZPL,
  createBarcodeLabel,
  createProductLabel,
  createQRLabel,
  
  // Pre-built templates
  LABEL_TEMPLATES,
  getTemplate,
  generateFromTemplate,
  
  // Constants
  DEFAULT_LABEL_CONFIG,
  FONTS,
  DPI,
} from './zpl/generator';

// Note: mmToDots, inchToDots, escapeZPL are exported from utils below

// Convenience re-export
import { ZPLBuilder } from './zpl/generator';

/**
 * ZPL utilities namespace
 */
export const ZPL = {
  /**
   * Create a new ZPL builder
   */
  builder: (config?: ConstructorParameters<typeof ZPLBuilder>[0]) => new ZPLBuilder(config),
  
  /**
   * Create a simple barcode label
   */
  barcode: (data: string, options?: { type?: string; height?: number }) => {
    const height = options?.height ?? 80;
    return `^XA^CI28^FO50,30^BCN,${height},Y,N,N^FD${data}^FS^XZ`;
  },
  
  /**
   * Create a simple text label
   */
  text: (text: string, options?: { font?: string; size?: number }) => {
    const font = options?.font ?? 'D';
    const size = options?.size ?? 24;
    return `^XA^CI28^FO50,50^A${font}N,${size},${size}^FD${text}^FS^XZ`;
  },
};

// ============================================================================
// PLUGIN
// ============================================================================

export {
  ZebraPlugin,
  NativePlugin,
} from './plugin';

export type {
  ZebraPluginInterface,
} from './plugin';

// ============================================================================
// UTILITIES
// ============================================================================

export {
  // Device detection
  isZebraDevice,
  getDeviceInfo,
  ZEBRA_MANUFACTURERS,
  
  // Barcode utilities
  validateBarcode,
  detectSymbology,
  calculateEAN13CheckDigit,
  calculateUPCACheckDigit,
  generateTestBarcode,
  BARCODE_PATTERNS,
  
  // Unit conversion
  mmToDots,
  inchesToDots,
  dotsToMm,
  dotsToInches,
  LABEL_SIZES,
  PRINT_DENSITIES,
  
  // ZPL utilities
  escapeZPL,
  unescapeZPL,
  estimatePrintTime,
  
  // Printer utilities
  parsePrinterAddress,
  formatPrinterAddress,
} from './utils';
