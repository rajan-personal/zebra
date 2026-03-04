/**
 * Capacitor Zebra Plugin Interface
 */

import { registerPlugin } from '@capacitor/core';

// Types
export interface InitResult {
  success: boolean;
  message: string;
  isZebraDevice?: boolean;
  scannerSdkAvailable?: boolean;
  dataWedgeAvailable?: boolean;
}

export interface PrinterInfo {
  name: string;
  address: string;
}

export interface ScannerInfo {
  id: number;
  name: string;
  address: string;
  type: number;
  isConnected: boolean;
}

export interface BarcodeResult {
  data: string;
  symbology: string;
  timestamp: number;
  source?: string;
}

export interface ScannerEvent {
  event: 'scannerConnected' | 'scannerDisconnected' | 'scannerAppeared' | 'scannerDisappeared';
  scannerName?: string;
  scannerId?: number;
}

// Plugin interface
export interface ZebraPlugin {
  initialize(): Promise<InitResult>;
  startScanning(): Promise<{ success: boolean; mode?: string; scannerName?: string }>;
  stopScanning(): Promise<{ success: boolean }>;
  // Bluetooth scanner methods (requires Scanner SDK)
  discoverScanners(): Promise<{ success: boolean; scanners: ScannerInfo[]; count: number; message?: string }>;
  connectScanner(options: { scannerId: number }): Promise<{ success: boolean; message?: string; scannerId?: number }>;
  disconnectScanner(): Promise<{ success: boolean; message?: string }>;
  isScannerConnected(): Promise<{ connected: boolean; sdkAvailable: boolean; scannerName?: string; scannerId?: number }>;
  // Printer methods
  discoverPrinters(): Promise<{ printers: PrinterInfo[] }>;
  connectPrinter(options: { address: string; name?: string }): Promise<{ success: boolean; message?: string }>;
  disconnectPrinter(): Promise<{ success: boolean }>;
  printZPL(options: { zpl: string }): Promise<{ success: boolean; message?: string }>;
  isPrinterConnected(): Promise<{ connected: boolean }>;
  getPrinterStatus(): Promise<{ isReady: boolean; isPaused: boolean; isHeadOpen: boolean; isPaperOut: boolean; isRibbonOut: boolean; messages?: string[] }>;
  // Event listeners
  addListener(eventName: string, listenerFunc: (data: unknown) => void): Promise<{ remove: () => void }>;
  removeAllListeners(): Promise<void>;
}

// Register plugin
export const ZebraPlugin = registerPlugin<ZebraPlugin>('ZebraPlugin');
