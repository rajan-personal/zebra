/**
 * Scanner Service - Barcode scanning with Zebra hardware or camera fallback
 */

import { ZebraPlugin, type BarcodeResult, type InitResult } from '../plugins/zebra';
import { CameraScanner, type CameraScanResult } from '../plugins/zebra/camera-scanner';

export type ScannerMode = 'zebra' | 'camera';
export type { BarcodeResult, InitResult };

export class ScannerService {
  private initialized = false;
  private scanning = false;
  private listeners = new Set<(barcode: BarcodeResult) => void>();
  private cameraScanner: CameraScanner | null = null;
  private mode: ScannerMode = 'camera';

  async initialize(): Promise<InitResult> {
    if (this.initialized) {
      return { success: true, message: 'Already initialized', isZebraDevice: this.mode === 'zebra' };
    }

    // Try Zebra plugin first
    try {
      const result = await ZebraPlugin.initialize();
      
      if (result.success && result.isZebraDevice) {
        // Real Zebra device
        await ZebraPlugin.addListener('barcodeScanned', (data: unknown) => {
          this.listeners.forEach(cb => cb(data as BarcodeResult));
        });
        this.mode = 'zebra';
        this.initialized = true;
        return { success: true, message: 'Zebra scanner ready', isZebraDevice: true };
      }
    } catch (error) {
      console.log('Zebra plugin not available, using camera...');
    }

    // Use camera as fallback
    this.cameraScanner = new CameraScanner();
    
    // Request camera permission
    const hasPermission = await this.cameraScanner.checkPermission();
    
    if (hasPermission) {
      this.cameraScanner.onScan((result: CameraScanResult) => {
        const barcode: BarcodeResult = {
          data: result.data,
          symbology: result.format || 'UNKNOWN',
          timestamp: result.timestamp,
          source: 'camera'
        };
        this.listeners.forEach(cb => cb(barcode));
      });
      this.mode = 'camera';
      this.initialized = true;
      return { success: true, message: 'Camera scanner ready', isZebraDevice: false };
    }

    // No scanner available
    this.initialized = true;
    this.mode = 'camera';
    return { success: false, message: 'Camera permission denied', isZebraDevice: false };
  }

  getMode(): ScannerMode {
    return this.mode;
  }

  async start(): Promise<boolean> {
    if (this.scanning) return true;

    if (this.mode === 'zebra') {
      const result = await ZebraPlugin.startScanning();
      this.scanning = result.success;
      return result.success;
    }
    
    // Camera mode
    if (this.cameraScanner) {
      const success = await this.cameraScanner.start();
      this.scanning = success;
      return success;
    }

    return false;
  }

  async stop(): Promise<boolean> {
    this.scanning = false;

    if (this.mode === 'zebra') {
      const result = await ZebraPlugin.stopScanning();
      return result.success;
    }
    
    if (this.cameraScanner) {
      await this.cameraScanner.stop();
      return true;
    }

    return true;
  }

  getCameraPreviewId(): string | null {
    return this.cameraScanner?.getPreviewId() ?? null;
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
    
    if (this.cameraScanner) {
      await this.cameraScanner.destroy();
      this.cameraScanner = null;
    }
    
    try {
      await ZebraPlugin.removeAllListeners();
    } catch {
      // Ignore if plugin not available
    }
    
    this.initialized = false;
  }
}
