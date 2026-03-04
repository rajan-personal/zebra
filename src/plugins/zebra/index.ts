/**
 * Capacitor Zebra Plugin Interface
 */

import { registerPlugin } from '@capacitor/core';

// Types
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
  discoverPrinters(): Promise<{ printers: PrinterInfo[] }>;
  connectPrinter(options: { address: string; name?: string }): Promise<{ success: boolean; message?: string }>;
  disconnectPrinter(): Promise<{ success: boolean }>;
  printZPL(options: { zpl: string }): Promise<{ success: boolean; message?: string }>;
  isPrinterConnected(): Promise<{ connected: boolean }>;
  getPrinterStatus(): Promise<{ isReady: boolean; isPaused: boolean; isHeadOpen: boolean; isPaperOut: boolean; isRibbonOut: boolean; messages?: string[] }>;
}

// Register plugin
export const ZebraPlugin = registerPlugin<ZebraPlugin>('ZebraPlugin');
