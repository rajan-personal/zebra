/**
 * Web implementation for demo/testing in browser
 */

import type { ZebraPlugin, BarcodeResult, PrinterInfo, InitResult } from './index';

class ZebraWeb implements ZebraPlugin {
  private listeners = new Map<string, ((data: unknown) => void)[]>();
  private scanning = false;
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private connectedPrinter: PrinterInfo | null = null;

  async initialize(): Promise<InitResult> {
    await new Promise(r => setTimeout(r, 300));
    return { 
      success: true, 
      message: 'Demo Mode',
      isZebraDevice: false 
    };
  }

  async startScanning(): Promise<{ success: boolean }> {
    this.scanning = true;
    
    this.scanInterval = setInterval(() => {
      if (!this.scanning) return;
      
      const barcodes = [
        'PROD-001', 'PROD-002', 'PROD-003',
        'SKU-12345', 'SKU-67890',
        '5901234123457'
      ];
      
      const barcode: BarcodeResult = {
        data: barcodes[Math.floor(Math.random() * barcodes.length)],
        timestamp: Date.now()
      };
      
      this.listeners.get('barcodeScanned')?.forEach(cb => cb(barcode));
    }, 3000);

    return { success: true };
  }

  async stopScanning(): Promise<{ success: boolean }> {
    this.scanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    return { success: true };
  }

  async addListener(event: string, callback: (data: unknown) => void): Promise<void> {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  async removeAllListeners(): Promise<void> {
    this.listeners.clear();
  }

  async discoverPrinters(): Promise<{ printers: PrinterInfo[] }> {
    return {
      printers: [
        { name: 'Zebra ZD410', address: '192.168.1.100:9100' },
        { name: 'Zebra QLn320', address: '00:11:22:33:44:55' },
      ]
    };
  }

  async connectPrinter(options: { address: string }): Promise<{ success: boolean }> {
    await new Promise(r => setTimeout(r, 500));
    this.connectedPrinter = { name: 'Printer', address: options.address };
    return { success: true };
  }

  async disconnectPrinter(): Promise<{ success: boolean }> {
    this.connectedPrinter = null;
    return { success: true };
  }

  async printZPL(options: { zpl: string }): Promise<{ success: boolean }> {
    if (!this.connectedPrinter) {
      throw new Error('Printer not connected');
    }
    console.log('[Zebra Web] Printing ZPL:', options.zpl);
    return { success: true };
  }
}

// Register web implementation
import { registerPlugin } from '@capacitor/core';
registerPlugin('ZebraPlugin', { web: new ZebraWeb() });
