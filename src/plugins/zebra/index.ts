/**
 * Capacitor Zebra Plugin Interface
 */

import { registerPlugin } from '@capacitor/core';

// Types
export interface BarcodeResult {
  data: string;
  timestamp: number;
}

export interface InitResult {
  success: boolean;
  message: string;
  isZebraDevice?: boolean;
}

export interface PrinterInfo {
  name: string;
  address: string;
}

// Plugin interface
export interface ZebraPlugin {
  initialize(): Promise<InitResult>;
  startScanning(): Promise<{ success: boolean }>;
  stopScanning(): Promise<{ success: boolean }>;
  addListener(event: string, callback: (data: unknown) => void): Promise<void>;
  removeAllListeners(): Promise<void>;
  discoverPrinters(): Promise<{ printers: PrinterInfo[] }>;
  connectPrinter(options: { address: string }): Promise<{ success: boolean }>;
  disconnectPrinter(): Promise<{ success: boolean }>;
  printZPL(options: { zpl: string }): Promise<{ success: boolean }>;
}

// Register plugin
export const ZebraPlugin = registerPlugin<ZebraPlugin>('ZebraPlugin');
