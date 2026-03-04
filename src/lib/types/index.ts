/**
 * @fileoverview Type definitions for Zebra Scanner & Printer library
 * @module @zebra-app/types
 * 
 * This module contains all TypeScript interfaces and types used throughout
 * the Zebra scanning and printing functionality.
 */

// ============================================================================
// INITIALIZATION TYPES
// ============================================================================

/**
 * Result returned from SDK initialization
 */
export interface InitResult {
  /** Whether initialization was successful */
  success: boolean;
  /** Human-readable status message */
  message: string;
  /** True if running on a Zebra hardware device */
  isZebraDevice?: boolean;
  /** True if Zebra Link-OS SDK is available */
  sdkAvailable?: boolean;
  /** True if DataWedge is available for scanning */
  dataWedgeAvailable?: boolean;
}

// ============================================================================
// BARCODE TYPES
// ============================================================================

/**
 * Represents a scanned barcode result
 */
export interface BarcodeResult {
  /** The decoded barcode data/string */
  data: string;
  /** Barcode symbology type (e.g., CODE128, EAN-13, QR) */
  symbology: string;
  /** Unix timestamp when barcode was scanned */
  timestamp: number;
  /** True if this is a special Zebra configuration barcode */
  isSpecialZebra: boolean;
  /** Raw bytes from the scanner (optional) */
  rawBytes?: number[];
}

/**
 * Supported barcode symbologies
 */
export type BarcodeSymbology = 
  | 'CODE128'
  | 'CODE39'
  | 'CODE93'
  | 'EAN-13'
  | 'EAN-8'
  | 'UPC-A'
  | 'UPC-E'
  | 'QR'
  | 'DATAMATRIX'
  | 'PDF417'
  | 'AZTEC'
  | 'UNKNOWN';

// ============================================================================
// PRINTER TYPES
// ============================================================================

/**
 * Connection types for Zebra printers
 */
export type PrinterConnectionType = 'bluetooth' | 'wifi' | 'usb';

/**
 * Printer connection options
 */
export interface PrinterOptions {
  /** Printer address (MAC for Bluetooth, IP:PORT for WiFi) */
  address: string;
  /** Connection type */
  type?: PrinterConnectionType;
  /** Printer name (optional, for display) */
  name?: string;
}

/**
 * Information about a discovered printer
 */
export interface PrinterInfo {
  /** Printer display name */
  name: string;
  /** Connection address */
  address: string;
  /** Connection type */
  type: PrinterConnectionType;
  /** Whether printer is currently online/available */
  isOnline: boolean;
}

/**
 * Printer status information
 */
export interface PrinterStatus {
  /** Printer is ready to print */
  isReady: boolean;
  /** Printer is paused */
  isPaused: boolean;
  /** Printer head is open */
  isHeadOpen: boolean;
  /** Printer is out of paper/labels */
  isPaperOut: boolean;
  /** Printer is out of ribbon (thermal transfer) */
  isRibbonOut: boolean;
  /** Status messages from printer */
  messages: string[];
}

// ============================================================================
// PRINT TYPES
// ============================================================================

/**
 * Supported print content formats
 */
export type PrintFormat = 'text' | 'zpl' | 'cpcl' | 'pdf' | 'image';

/**
 * Print job options
 */
export interface PrintOptions {
  /** Content to print (text or ZPL depending on format) */
  content: string;
  /** Content format */
  format?: PrintFormat;
  /** Number of copies to print */
  copies?: number;
  /** Label width in dots */
  width?: number;
  /** Label height in dots */
  height?: number;
  /** Print density (dpmm) */
  density?: number;
}

/**
 * Result from a print operation
 */
export interface PrintResult {
  /** Whether print was successful */
  success: boolean;
  /** Human-readable status message */
  message: string;
}

// ============================================================================
// ZPL TYPES
// ============================================================================

/**
 * Label dimension units
 */
export type LabelUnit = 'mm' | 'inch' | 'dots';

/**
 * Label template configuration
 */
export interface LabelConfig {
  /** Label width */
  width: number;
  /** Label height */
  height: number;
  /** Unit of measurement */
  unit?: LabelUnit;
  /** Print density in dots per mm (6, 8, 12, 24) */
  density?: number;
  /** Print speed (inches per second) */
  speed?: number;
}

/**
 * Field origin position
 */
export interface FieldOrigin {
  /** X position in dots */
  x: number;
  /** Y position in dots */
  y: number;
  /** Justification (left, center, right) */
  justification?: 'left' | 'center' | 'right';
}

/**
 * Barcode field options
 */
export interface BarcodeFieldOptions {
  /** Position of the barcode */
  origin: FieldOrigin;
  /** Barcode height in dots */
  height: number;
  /** Print human-readable text below barcode */
  printText?: boolean;
  /** Text position (Y=top, N=bottom) */
  textPosition?: 'top' | 'bottom' | 'none';
  /** Barcode data to encode */
  data: string;
  /** Barcode symbology */
  type?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPCA' | 'QR';
  /** Narrow bar width for 1D barcodes */
  narrowBarWidth?: number;
  /** Wide bar width for 1D barcodes */
  wideBarWidth?: number;
}

/**
 * Text field options
 */
export interface TextFieldOptions {
  /** Position of the text */
  origin: FieldOrigin;
  /** Text content */
  data: string;
  /** Font name or identifier */
  font?: string;
  /** Font height in dots */
  fontHeight?: number;
  /** Font width in dots */
  fontWidth?: number;
  /** Maximum field width for wrapping */
  maxWidth?: number;
}

/**
 * QR Code field options
 */
export interface QRCodeFieldOptions {
  /** Position of the QR code */
  origin: FieldOrigin;
  /** QR code data */
  data: string;
  /** Model (1 or 2) */
  model?: 1 | 2;
  /** Magnification factor (1-10) */
  magnification?: number;
  /** Error correction level */
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  /** Mask value (0-7, or auto) */
  mask?: number | 'auto';
}

/**
 * Box/rectangle field options
 */
export interface BoxFieldOptions {
  /** Top-left corner position */
  origin: FieldOrigin;
  /** Box width in dots */
  width: number;
  /** Box height in dots */
  height: number;
  /** Border thickness in dots */
  thickness?: number;
  /** Line color (B=black, W=white) */
  color?: 'B' | 'W';
  /** Corner rounding (0-8) */
  rounding?: number;
}

/**
 * Label template - combination of fields
 */
export interface LabelTemplate {
  /** Unique template identifier */
  id: string;
  /** Display name */
  name: string;
  /** Label configuration */
  config: LabelConfig;
  /** Function to generate ZPL from data */
  generate: (data: LabelData) => string;
  /** Field definitions for UI form generation */
  fields?: LabelFieldDef[];
}

/**
 * Label field definition for UI forms
 */
export interface LabelFieldDef {
  /** Field name/key */
  name: string;
  /** Display label */
  label: string;
  /** Field type */
  type: 'text' | 'number' | 'barcode' | 'select';
  /** Is field required */
  required?: boolean;
  /** Default value */
  default?: string;
  /** Placeholder text */
  placeholder?: string;
  /** For select type - available options */
  options?: { value: string; label: string }[];
}

/**
 * Data used to populate a label template
 */
export interface LabelData {
  /** Barcode data (required) */
  barcode: string;
  /** Product name */
  productName?: string;
  /** SKU or item code */
  sku?: string;
  /** Price string */
  price?: string;
  /** Quantity */
  quantity?: string;
  /** Additional custom fields */
  [key: string]: string | undefined;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Events emitted by the Zebra plugin
 */
export type ZebraEventType = 'barcodeScanned' | 'printerDiscovered';

/**
 * Event listener callback types
 */
export interface ZebraEventMap {
  barcodeScanned: BarcodeResult;
  printerDiscovered: PrinterInfo;
}

// ============================================================================
// PLUGIN INTERFACE
// ============================================================================

/**
 * Main Zebra plugin interface
 * 
 * @example
 * ```typescript
 * import Zebra from '@zebra-app/plugin';
 * 
 * // Initialize
 * const result = await Zebra.initialize();
 * 
 * // Start scanning
 * await Zebra.startScanning();
 * 
 * // Listen for barcodes
 * Zebra.addListener('barcodeScanned', (barcode) => {
 *   console.log('Scanned:', barcode.data);
 * });
 * ```
 */
export interface ZebraPlugin {
  // Initialization
  initialize(): Promise<InitResult>;
  
  // Scanning
  startScanning(): Promise<{ success: boolean; mode?: string; message?: string }>;
  stopScanning(): Promise<{ success: boolean; message?: string }>;
  addBarcodeListener(callback: (result: BarcodeResult) => void): Promise<{ success: boolean }>;
  removeBarcodeListener(): Promise<{ success: boolean }>;
  
  // Events
  addListener<E extends ZebraEventType>(
    eventName: E, 
    callback: (result: ZebraEventMap[E]) => void
  ): Promise<{ success: boolean }>;
  
  // Printing
  connectPrinter(options: PrinterOptions): Promise<PrintResult>;
  disconnectPrinter(): Promise<{ success: boolean; message?: string }>;
  print(options: PrintOptions): Promise<PrintResult>;
  printZPL(options: { zpl: string }): Promise<PrintResult>;
  
  // Discovery
  discoverPrinters(): Promise<{ success: boolean; printers: PrinterInfo[]; message?: string }>;
  getPrinters(): Promise<{ printers: PrinterInfo[] }>;
  
  // Status
  isPrinterConnected(): Promise<{ connected: boolean }>;
  getPrinterStatus(): Promise<PrinterStatus>;
}
