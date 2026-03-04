import { registerPlugin } from '@capacitor/core';

export interface ZebraPlugin {
  /**
   * Initialize the Zebra SDK
   */
  initialize(): Promise<InitResult>;

  /**
   * Start listening for barcode scans
   */
  startScanning(): Promise<{ success: boolean; mode?: string; message?: string }>;

  /**
   * Stop listening for barcode scans
   */
  stopScanning(): Promise<{ success: boolean; message?: string }>;

  /**
   * Add listener for barcode scan events
   */
  addBarcodeListener(
    callback: (result: BarcodeResult) => void
  ): Promise<{ success: boolean }>;

  /**
   * Remove barcode listener
   */
  removeBarcodeListener(): Promise<{ success: boolean }>;

  /**
   * Add event listener (generic)
   */
  addListener(eventName: string, callback: (result: unknown) => void): Promise<{ success: boolean }>;

  /**
   * Connect to a Zebra printer
   */
  connectPrinter(options: PrinterOptions): Promise<{ success: boolean; message: string }>;

  /**
   * Disconnect from the current printer
   */
  disconnectPrinter(): Promise<{ success: boolean; message?: string }>;

  /**
   * Print content to the connected printer
   */
  print(options: PrintOptions): Promise<{ success: boolean; message: string }>;

  /**
   * Print a label with ZPL commands
   */
  printZPL(options: { zpl: string }): Promise<{ success: boolean; message: string }>;

  /**
   * Discover available printers
   */
  discoverPrinters(): Promise<{ success: boolean; printers: PrinterInfo[]; message?: string }>;

  /**
   * Get list of available printers (legacy)
   */
  getPrinters(): Promise<{ printers: PrinterInfo[] }>;

  /**
   * Check if printer is connected
   */
  isPrinterConnected(): Promise<{ connected: boolean }>;

  /**
   * Get printer status
   */
  getPrinterStatus(): Promise<PrinterStatus>;
}

export interface InitResult {
  success: boolean;
  message: string;
  isZebraDevice?: boolean;
  sdkAvailable?: boolean;
  dataWedgeAvailable?: boolean;
}

export interface BarcodeResult {
  data: string;
  symbology: string;
  timestamp: number;
  isSpecialZebra: boolean;
  rawBytes?: number[];
}

export interface PrinterOptions {
  address: string;
  type?: 'bluetooth' | 'wifi' | 'usb';
  name?: string;
}

export interface PrinterInfo {
  name: string;
  address: string;
  type: 'bluetooth' | 'wifi' | 'usb';
  isOnline: boolean;
}

export interface PrintOptions {
  content: string;
  format?: 'text' | 'zpl' | 'cpcl' | 'pdf' | 'image';
  copies?: number;
  width?: number;
  height?: number;
  density?: number;
}

export interface PrinterStatus {
  isReady: boolean;
  isPaused: boolean;
  isHeadOpen: boolean;
  isPaperOut: boolean;
  isRibbonOut: boolean;
  messages: string[];
}

// Register the plugin
const Zebra = registerPlugin<ZebraPlugin>('ZebraPlugin');

export default Zebra;
