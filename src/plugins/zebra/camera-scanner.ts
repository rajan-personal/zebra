/**
 * Camera-based barcode scanner using HTML5 QRCode
 * Used as fallback when Zebra hardware scanner is not available
 */

import { Camera } from '@capacitor/camera';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface CameraScanResult {
  data: string;
  format: string;
  timestamp: number;
}

export class CameraScanner {
  private scanner: Html5Qrcode | null = null;
  private scanning = false;
  private listeners = new Set<(result: CameraScanResult) => void>();
  private elementId = 'camera-preview-' + Math.random().toString(36).substr(2, 9);

  async checkPermission(): Promise<boolean> {
    try {
      const status = await Camera.checkPermissions();
      if (status.camera === 'granted') {
        return true;
      }
      
      const requestStatus = await Camera.requestPermissions({ permissions: ['camera'] });
      return requestStatus.camera === 'granted';
    } catch (error) {
      console.error('Permission error:', error);
      // Fallback to browser API
      try {
        const result = await navigator.mediaDevices.getUserMedia({ video: true });
        result.getTracks().forEach(t => t.stop());
        return true;
      } catch {
        return false;
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    const hasPermission = await this.checkPermission();
    if (!hasPermission) return false;
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(d => d.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  getPreviewId(): string {
    return this.elementId;
  }

  async start(deviceId?: string): Promise<boolean> {
    if (this.scanning) return true;

    // Request permission first
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      console.error('Camera permission denied');
      return false;
    }

    try {
      // Create scanner
      this.scanner = new Html5Qrcode(this.elementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false
      });

      // Get cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        console.error('No cameras found');
        return false;
      }

      // Prefer back camera
      const backCamera = devices.find(d => d.label.toLowerCase().includes('back'));
      const cameraId = deviceId || backCamera?.id || devices[0].id;

      await this.scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 }
        },
        (decodedText, decodedResult) => {
          if (!this.scanning) return;
          
          const scanResult: CameraScanResult = {
            data: decodedText,
            format: decodedResult.result.format?.formatName || 'UNKNOWN',
            timestamp: Date.now()
          };
          this.listeners.forEach(cb => cb(scanResult));
        },
        (errorMessage) => {
          // Ignore scan errors (no barcode found)
        }
      );

      this.scanning = true;
      return true;
    } catch (error) {
      console.error('Failed to start camera scanner:', error);
      this.scanning = false;
      return false;
    }
  }

  async stop(): Promise<void> {
    this.scanning = false;
    
    if (this.scanner) {
      try {
        await this.scanner.stop();
        this.scanner.clear();
      } catch (e) {
        // Ignore
      }
      this.scanner = null;
    }
  }

  onScan(callback: (result: CameraScanResult) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  isScanning(): boolean {
    return this.scanning;
  }

  async destroy(): Promise<void> {
    await this.stop();
    this.listeners.clear();
  }
}
