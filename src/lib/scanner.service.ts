/**
 * Scanner Service - Barcode scanning only
 */

import { ZebraPlugin, type BarcodeResult, type InitResult } from '../plugins/zebra';

export type { BarcodeResult, InitResult };

export class ScannerService {
  private initialized = false;
  private scanning = false;
  private listeners = new Set<(barcode: BarcodeResult) => void>();

  async initialize(): Promise<InitResult> {
    if (this.initialized) {
      return { success: true, message: 'Already initialized' };
    }

    const result = await ZebraPlugin.initialize();

    if (result.success) {
      await ZebraPlugin.addListener('barcodeScanned', (data: unknown) => {
        this.listeners.forEach(cb => cb(data as BarcodeResult));
      });
      this.initialized = true;
    }

    return result;
  }

  async start(): Promise<boolean> {
    const result = await ZebraPlugin.startScanning();
    this.scanning = result.success;
    return result.success;
  }

  async stop(): Promise<boolean> {
    const result = await ZebraPlugin.stopScanning();
    this.scanning = false;
    return result.success;
  }

  onScan(callback: (barcode: BarcodeResult) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  isScanning(): boolean {
    return this.scanning;
  }

  async destroy(): Promise<void> {
    if (this.scanning) await this.stop();
    this.listeners.clear();
    await ZebraPlugin.removeAllListeners();
    this.initialized = false;
  }
}
