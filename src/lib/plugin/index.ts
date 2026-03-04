/**
 * @fileoverview Capacitor Plugin Wrapper for Zebra Scanner & Printer
 * @module @zebra-app/plugin
 * 
 * Provides a clean, typed interface to the Zebra Capacitor plugin.
 * Handles plugin registration, event management, and error handling.
 * 
 * @example
 * ```typescript
 * import { ZebraPlugin } from '@zebra-app/plugin';
 * 
 * // Initialize
 * const result = await ZebraPlugin.initialize();
 * 
 * // Add barcode listener
 * await ZebraPlugin.addBarcodeListener((barcode) => {
 *   console.log('Scanned:', barcode.data);
 * });
 * 
 * // Start scanning
 * await ZebraPlugin.startScanning();
 * ```
 */

import { registerPlugin } from '@capacitor/core';
import type {
  InitResult,
  BarcodeResult,
  PrinterOptions,
  PrinterInfo,
  PrinterStatus,
  PrintOptions,
} from '../types';

// ============================================================================
// PLUGIN INTERFACE
// ============================================================================

/**
 * Native plugin interface - matches the Capacitor plugin definition
 */
export interface ZebraPluginInterface {
  // Initialization
  initialize(): Promise<InitResult>;
  
  // Scanning
  startScanning(): Promise<{ success: boolean; mode?: string; message?: string }>;
  stopScanning(): Promise<{ success: boolean; message?: string }>;
  addBarcodeListener(callback: (result: BarcodeResult) => void): Promise<{ success: boolean }>;
  removeBarcodeListener(): Promise<{ success: boolean }>;
  
  // Generic event listener (Capacitor style)
  addListener(eventName: string, callback: (result: unknown) => void): Promise<{ success: boolean }>;
  removeAllListeners(): Promise<void>;
  
  // Printer
  connectPrinter(options: PrinterOptions): Promise<{ success: boolean; message: string }>;
  disconnectPrinter(): Promise<{ success: boolean; message?: string }>;
  print(options: PrintOptions): Promise<{ success: boolean; message: string }>;
  printZPL(options: { zpl: string }): Promise<{ success: boolean; message: string }>;
  
  // Discovery
  discoverPrinters(): Promise<{ success: boolean; printers: PrinterInfo[]; message?: string }>;
  getPrinters(): Promise<{ printers: PrinterInfo[] }>;
  
  // Status
  isPrinterConnected(): Promise<{ connected: boolean }>;
  getPrinterStatus(): Promise<PrinterStatus>;
}

// ============================================================================
// PLUGIN REGISTRATION
// ============================================================================

/**
 * Register the Zebra plugin with Capacitor
 */
const NativePlugin = registerPlugin<ZebraPluginInterface>('ZebraPlugin');

// ============================================================================
// EVENT MANAGER
// ============================================================================

type EventCallback<T = unknown> = (data: T) => void;

/**
 * Event manager for handling plugin events
 */
class EventManager {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  
  /**
   * Add an event listener
   */
  addListener<T>(eventName: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    
    this.listeners.get(eventName)!.add(callback as EventCallback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(eventName)?.delete(callback as EventCallback);
    };
  }
  
  /**
   * Emit an event to all listeners
   */
  emit<T>(eventName: string, data: T): void {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
  
  /**
   * Remove all listeners for an event
   */
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }
  
  /**
   * Get listener count for an event
   */
  listenerCount(eventName: string): number {
    return this.listeners.get(eventName)?.size ?? 0;
  }
}

// ============================================================================
// PLUGIN WRAPPER CLASS
// ============================================================================

/**
 * Zebra Plugin wrapper with enhanced functionality
 */
class ZebraPluginWrapper {
  private eventManager = new EventManager();
  private initialized = false;
  private initResult: InitResult | null = null;
  
  // -------------------------------------------------------------------------
  // INITIALIZATION
  // -------------------------------------------------------------------------
  
  /**
   * Initialize the Zebra SDK
   * Must be called before using other methods
   */
  async initialize(): Promise<InitResult> {
    if (this.initialized && this.initResult) {
      return this.initResult;
    }
    
    try {
      const result = await NativePlugin.initialize();
      this.initResult = result;
      this.initialized = result.success;
      
      console.log('[ZebraPlugin] Initialized:', result);
      return result;
    } catch (error) {
      const result: InitResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Initialization failed',
        isZebraDevice: false,
        sdkAvailable: false,
        dataWedgeAvailable: false,
      };
      this.initResult = result;
      return result;
    }
  }
  
  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Get initialization result
   */
  getInitResult(): InitResult | null {
    return this.initResult;
  }
  
  /**
   * Check if running on Zebra hardware
   */
  isZebraDevice(): boolean {
    return this.initResult?.isZebraDevice ?? false;
  }
  
  // -------------------------------------------------------------------------
  // SCANNING
  // -------------------------------------------------------------------------
  
  /**
   * Start scanning for barcodes
   */
  async startScanning(): Promise<{ success: boolean; mode?: string; message?: string }> {
    this.ensureInitialized();
    return NativePlugin.startScanning();
  }
  
  /**
   * Stop scanning for barcodes
   */
  async stopScanning(): Promise<{ success: boolean; message?: string }> {
    this.ensureInitialized();
    return NativePlugin.stopScanning();
  }
  
  /**
   * Add a barcode listener
   * @param callback - Function to call when barcode is scanned
   * @returns Unsubscribe function
   */
  async addBarcodeListener(callback: (result: BarcodeResult) => void): Promise<() => void> {
    this.ensureInitialized();
    
    // Register with native plugin
    await NativePlugin.addListener('barcodeScanned', (data: unknown) => {
      const barcode = data as BarcodeResult;
      
      // Emit to local event manager
      this.eventManager.emit('barcodeScanned', barcode);
      
      // Call the callback
      callback(barcode);
    });
    
    // Also add to local event manager
    return this.eventManager.addListener('barcodeScanned', callback);
  }
  
  /**
   * Add a generic event listener
   * @param eventName - Event name (e.g., 'barcodeScanned')
   * @param callback - Function to call when event occurs
   * @returns Unsubscribe function
   */
  async addListener<T = unknown>(
    eventName: string,
    callback: (result: T) => void
  ): Promise<() => void> {
    this.ensureInitialized();
    
    await NativePlugin.addListener(eventName, (data: unknown) => {
      this.eventManager.emit(eventName, data);
      callback(data as T);
    });
    
    return this.eventManager.addListener(eventName, callback as EventCallback);
  }
  
  /**
   * Remove barcode listener
   */
  async removeBarcodeListener(): Promise<{ success: boolean }> {
    return NativePlugin.removeBarcodeListener();
  }
  
  /**
   * Remove all event listeners
   */
  async removeAllListeners(): Promise<void> {
    this.eventManager.removeAllListeners();
    return NativePlugin.removeAllListeners();
  }
  
  // -------------------------------------------------------------------------
  // PRINTER
  // -------------------------------------------------------------------------
  
  /**
   * Connect to a Zebra printer
   */
  async connectPrinter(options: PrinterOptions): Promise<{ success: boolean; message: string }> {
    this.ensureInitialized();
    return NativePlugin.connectPrinter(options);
  }
  
  /**
   * Disconnect from current printer
   */
  async disconnectPrinter(): Promise<{ success: boolean; message?: string }> {
    this.ensureInitialized();
    return NativePlugin.disconnectPrinter();
  }
  
  /**
   * Print content
   */
  async print(options: PrintOptions): Promise<{ success: boolean; message: string }> {
    this.ensureInitialized();
    return NativePlugin.print(options);
  }
  
  /**
   * Print raw ZPL
   */
  async printZPL(zpl: string): Promise<{ success: boolean; message: string }> {
    this.ensureInitialized();
    console.log('[ZebraPlugin] Printing ZPL:', zpl);
    return NativePlugin.printZPL({ zpl });
  }
  
  /**
   * Discover available printers
   */
  async discoverPrinters(): Promise<{ success: boolean; printers: PrinterInfo[]; message?: string }> {
    this.ensureInitialized();
    return NativePlugin.discoverPrinters();
  }
  
  /**
   * Get list of printers (legacy method)
   */
  async getPrinters(): Promise<{ printers: PrinterInfo[] }> {
    this.ensureInitialized();
    return NativePlugin.getPrinters();
  }
  
  /**
   * Check if printer is connected
   */
  async isPrinterConnected(): Promise<{ connected: boolean }> {
    this.ensureInitialized();
    return NativePlugin.isPrinterConnected();
  }
  
  /**
   * Get printer status
   */
  async getPrinterStatus(): Promise<PrinterStatus> {
    this.ensureInitialized();
    return NativePlugin.getPrinterStatus();
  }
  
  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------
  
  /**
   * Ensure SDK is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      console.warn('[ZebraPlugin] SDK not initialized, auto-initializing...');
      // Don't throw - allow auto-initialization
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Zebra Plugin instance
 * 
 * Usage:
 * ```typescript
 * import { ZebraPlugin } from '@zebra-app/plugin';
 * 
 * // Initialize
 * const result = await ZebraPlugin.initialize();
 * 
 * if (result.success) {
 *   // Add barcode listener
 *   const unsubscribe = await ZebraPlugin.addBarcodeListener((barcode) => {
 *     console.log('Scanned:', barcode.data);
 *   });
 *   
 *   // Start scanning
 *   await ZebraPlugin.startScanning();
 *   
 *   // Later: stop and cleanup
 *   await ZebraPlugin.stopScanning();
 *   unsubscribe();
 * }
 * ```
 */
export const ZebraPlugin = new ZebraPluginWrapper();

/**
 * Native plugin reference for advanced usage
 */
export { NativePlugin };

// Types are already exported inline above
