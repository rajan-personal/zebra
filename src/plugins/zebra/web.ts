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
      message: 'Web Demo Mode',
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
        symbology: 'CODE_128',
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

  // Bluetooth scanner stubs (not available on web)
  async discoverScanners(): Promise<{ success: boolean; scanners: never[]; count: number; message: string }> {
    return { success: false, scanners: [], count: 0, message: 'Bluetooth scanners not available on web' };
  }

  async connectScanner(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Bluetooth scanners not available on web' };
  }

  async disconnectScanner(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Bluetooth scanners not available on web' };
  }

  async isScannerConnected(): Promise<{ connected: boolean; sdkAvailable: boolean }> {
    return { connected: false, sdkAvailable: false };
  }

  async addListener(eventName: 'barcodeScanned' | 'scannerEvent', listenerFunc: (data: unknown) => void): Promise<{ remove: () => void }> {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)?.push(listenerFunc);
    return { remove: () => {
      const arr = this.listeners.get(eventName);
      if (arr) {
        const idx = arr.indexOf(listenerFunc);
        if (idx >= 0) arr.splice(idx, 1);
      }
    }};
  }

  async removeAllListeners(): Promise<void> {
    this.listeners.clear();
  }

  async discoverPrinters(): Promise<{ printers: PrinterInfo[] }> {
    return {
      printers: [
        { name: 'Web Demo Printer', address: '127.0.0.1:9100' },
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
    return { success: true };
  }

  async isPrinterConnected(): Promise<{ connected: boolean }> {
    return { connected: this.connectedPrinter !== null };
  }

  async getPrinterStatus(): Promise<{ isReady: boolean; isPaused: boolean; isHeadOpen: boolean; isPaperOut: boolean; isRibbonOut: boolean }> {
    return { isReady: true, isPaused: false, isHeadOpen: false, isPaperOut: false, isRibbonOut: false };
  }
}

// Only register web implementation for web platform (not Android)
if (typeof window !== 'undefined' && !(window as any).capacitorPlugins) {
  import('@capacitor/core').then(({ registerPlugin }) => {
    registerPlugin('ZebraPlugin', { web: new ZebraWeb() });
  });
}
