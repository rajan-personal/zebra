/**
 * @fileoverview React Hooks for Zebra Scanner & Printer library
 * @module @zebra-app/hooks
 * 
 * Provides React hooks for easy integration with Zebra hardware:
 * - useZebraScanner: Barcode scanning functionality
 * - useZebraPrinter: Printer connection and printing
 * - useZebra: Combined scanner + printer functionality
 * 
 * @example
 * ```tsx
 * import { useZebraScanner, useZebraPrinter } from '@zebra-app/hooks';
 * 
 * function MyComponent() {
 *   const { barcodes, isScanning, startScanning, stopScanning } = useZebraScanner();
 *   const { connect, print, isConnected } = useZebraPrinter();
 *   
 *   return <div>...</div>;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Zebra from '../../plugins/zebra';
import type {
  BarcodeResult,
  PrinterInfo,
  PrinterStatus,
  PrinterOptions,
  PrintOptions,
  InitResult,
} from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Scanner hook state
 */
export interface ScannerState {
  /** List of scanned barcodes (most recent first) */
  barcodes: BarcodeResult[];
  /** Whether scanner is actively listening */
  isScanning: boolean;
  /** Whether the SDK is initialized */
  isInitialized: boolean;
  /** Initialization result details */
  initResult: InitResult | null;
  /** Last error message */
  error: string | null;
}

/**
 * Scanner hook actions
 */
export interface ScannerActions {
  /** Start listening for barcode scans */
  startScanning: () => Promise<void>;
  /** Stop listening for barcode scans */
  stopScanning: () => Promise<void>;
  /** Toggle scanning on/off */
  toggleScanning: () => Promise<void>;
  /** Clear the barcode history */
  clearBarcodes: () => void;
  /** Re-initialize the SDK */
  reinitialize: () => Promise<void>;
}

/**
 * Return type for useZebraScanner hook
 */
export type UseZebraScannerReturn = ScannerState & ScannerActions;

/**
 * Printer hook state
 */
export interface PrinterState {
  /** List of discovered printers */
  printers: PrinterInfo[];
  /** Currently connected printer */
  connectedPrinter: PrinterInfo | null;
  /** Whether a printer is connected */
  isConnected: boolean;
  /** Current printer status */
  status: PrinterStatus | null;
  /** Whether currently printing */
  isPrinting: boolean;
  /** Last error message */
  error: string | null;
}

/**
 * Printer hook actions
 */
export interface PrinterActions {
  /** Discover available printers */
  discoverPrinters: () => Promise<PrinterInfo[]>;
  /** Connect to a printer */
  connect: (printer: PrinterOptions) => Promise<boolean>;
  /** Disconnect from current printer */
  disconnect: () => Promise<void>;
  /** Print content */
  print: (options: PrintOptions) => Promise<boolean>;
  /** Print raw ZPL */
  printZPL: (zpl: string) => Promise<boolean>;
  /** Refresh printer status */
  refreshStatus: () => Promise<void>;
  /** Check if connected */
  checkConnection: () => Promise<boolean>;
}

/**
 * Return type for useZebraPrinter hook
 */
export type UseZebraPrinterReturn = PrinterState & PrinterActions;

/**
 * Combined hook options
 */
export interface UseZebraOptions {
  /** Auto-start scanning on mount */
  autoStartScanning?: boolean;
  /** Auto-discover printers on mount */
  autoDiscoverPrinters?: boolean;
  /** Maximum barcodes to keep in history */
  maxBarcodeHistory?: number;
  /** Callback when barcode is scanned */
  onBarcodeScanned?: (barcode: BarcodeResult) => void;
  /** Callback when printer connects */
  onPrinterConnected?: (printer: PrinterInfo) => void;
  /** Callback when printer disconnects */
  onPrinterDisconnected?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

// ============================================================================
// USE ZEBRA SCANNER HOOK
// ============================================================================

/**
 * React hook for Zebra barcode scanning
 * 
 * @param options - Configuration options
 * @returns Scanner state and actions
 * 
 * @example
 * ```tsx
 * function ScannerComponent() {
 *   const { 
 *     barcodes, 
 *     isScanning, 
 *     startScanning, 
 *     stopScanning,
 *     isInitialized 
 *   } = useZebraScanner({
 *     onBarcodeScanned: (barcode) => console.log('Scanned:', barcode.data)
 *   });
 *   
 *   return (
 *     <div>
 *       <p>Status: {isInitialized ? 'Ready' : 'Initializing...'}</p>
 *       <button onClick={isScanning ? stopScanning : startScanning}>
 *         {isScanning ? 'Stop' : 'Start'} Scanning
 *       </button>
 *       <ul>
 *         {barcodes.map((b, i) => <li key={i}>{b.data}</li>)}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useZebraScanner(options: {
  maxBarcodeHistory?: number;
  onBarcodeScanned?: (barcode: BarcodeResult) => void;
  onError?: (error: string) => void;
} = {}): UseZebraScannerReturn {
  const { maxBarcodeHistory = 50, onBarcodeScanned, onError } = options;
  
  const [barcodes, setBarcodes] = useState<BarcodeResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initResult, setInitResult] = useState<InitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const listenerRegistered = useRef(false);

  // Initialize SDK and register listener
  useEffect(() => {
    const init = async () => {
      try {
        const result = await Zebra.initialize();
        setInitResult(result);
        setIsInitialized(result.success);
        
        if (!result.success) {
          setError(result.message);
          onError?.(result.message);
          return;
        }
        
        // Register barcode listener (only once)
        if (!listenerRegistered.current) {
          await Zebra.addListener('barcodeScanned', (result: unknown) => {
            const barcode = result as BarcodeResult;
            console.log('[useZebraScanner] Barcode scanned:', barcode);
            
            setBarcodes(prev => [barcode, ...prev].slice(0, maxBarcodeHistory));
            onBarcodeScanned?.(barcode);
          });
          
          listenerRegistered.current = true;
          console.log('[useZebraScanner] Listener registered');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Initialization failed';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };
    
    init();
    
    // Cleanup not needed - listener persists for app lifetime
  }, [maxBarcodeHistory, onBarcodeScanned, onError]);

  const startScanning = useCallback(async () => {
    try {
      await Zebra.startScanning();
      setIsScanning(true);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start scanning';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [onError]);

  const stopScanning = useCallback(async () => {
    try {
      await Zebra.stopScanning();
      setIsScanning(false);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to stop scanning';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [onError]);

  const toggleScanning = useCallback(async () => {
    if (isScanning) {
      await stopScanning();
    } else {
      await startScanning();
    }
  }, [isScanning, startScanning, stopScanning]);

  const clearBarcodes = useCallback(() => {
    setBarcodes([]);
  }, []);

  const reinitialize = useCallback(async () => {
    setIsInitialized(false);
    listenerRegistered.current = false;
    
    try {
      const result = await Zebra.initialize();
      setInitResult(result);
      setIsInitialized(result.success);
      
      if (!result.success) {
        setError(result.message);
        onError?.(result.message);
        return;
      }
      
      await Zebra.addListener('barcodeScanned', (result: unknown) => {
        const barcode = result as BarcodeResult;
        setBarcodes(prev => [barcode, ...prev].slice(0, maxBarcodeHistory));
        onBarcodeScanned?.(barcode);
      });
      
      listenerRegistered.current = true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Reinitialization failed';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [maxBarcodeHistory, onBarcodeScanned, onError]);

  return {
    // State
    barcodes,
    isScanning,
    isInitialized,
    initResult,
    error,
    // Actions
    startScanning,
    stopScanning,
    toggleScanning,
    clearBarcodes,
    reinitialize,
  };
}

// ============================================================================
// USE ZEBRA PRINTER HOOK
// ============================================================================

/**
 * React hook for Zebra printer operations
 * 
 * @param options - Configuration options
 * @returns Printer state and actions
 * 
 * @example
 * ```tsx
 * function PrinterComponent() {
 *   const {
 *     printers,
 *     connect,
 *     print,
 *     printZPL,
 *     isConnected,
 *     connectedPrinter
 *   } = useZebraPrinter({
 *     autoDiscoverPrinters: true
 *   });
 *   
 *   const handlePrint = async () => {
 *     await printZPL('^XA^FO50,50^ADN,36,20^FDHello^FS^XZ');
 *   };
 *   
 *   return (
 *     <div>
 *       <select onChange={(e) => connect({ address: e.target.value })}>
 *         {printers.map(p => <option key={p.address} value={p.address}>{p.name}</option>)}
 *       </select>
 *       <button onClick={handlePrint} disabled={!isConnected}>Print</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useZebraPrinter(options: {
  autoDiscoverPrinters?: boolean;
  onPrinterConnected?: (printer: PrinterInfo) => void;
  onPrinterDisconnected?: () => void;
  onError?: (error: string) => void;
} = {}): UseZebraPrinterReturn {
  const { autoDiscoverPrinters = false, onPrinterConnected, onPrinterDisconnected, onError } = options;
  
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [connectedPrinter, setConnectedPrinter] = useState<PrinterInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-discover printers on mount if enabled
  useEffect(() => {
    if (autoDiscoverPrinters) {
      discoverPrinters();
    }
  }, [autoDiscoverPrinters]);

  const discoverPrinters = useCallback(async (): Promise<PrinterInfo[]> => {
    try {
      const result = await Zebra.discoverPrinters();
      setPrinters(result.printers);
      setError(null);
      return result.printers;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to discover printers';
      setError(errorMsg);
      onError?.(errorMsg);
      return [];
    }
  }, [onError]);

  const connect = useCallback(async (printerOptions: PrinterOptions): Promise<boolean> => {
    try {
      const result = await Zebra.connectPrinter(printerOptions);
      
      if (result.success) {
        const printer: PrinterInfo = {
          name: printerOptions.name || printerOptions.address,
          address: printerOptions.address,
          type: printerOptions.type || 'bluetooth',
          isOnline: true,
        };
        
        setConnectedPrinter(printer);
        setIsConnected(true);
        setError(null);
        
        // Get initial status
        const printerStatus = await Zebra.getPrinterStatus();
        setStatus(printerStatus);
        
        onPrinterConnected?.(printer);
        return true;
      } else {
        setError(result.message);
        onError?.(result.message);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }
  }, [onPrinterConnected, onError]);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await Zebra.disconnectPrinter();
      setConnectedPrinter(null);
      setIsConnected(false);
      setStatus(null);
      setError(null);
      onPrinterDisconnected?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [onPrinterDisconnected, onError]);

  const print = useCallback(async (printOptions: PrintOptions): Promise<boolean> => {
    if (!isConnected) {
      setError('No printer connected');
      onError?.('No printer connected');
      return false;
    }
    
    setIsPrinting(true);
    try {
      const result = await Zebra.print(printOptions);
      
      if (result.success) {
        setError(null);
        return true;
      } else {
        setError(result.message);
        onError?.(result.message);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Print failed';
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [isConnected, onError]);

  const printZPL = useCallback(async (zpl: string): Promise<boolean> => {
    if (!isConnected) {
      setError('No printer connected');
      onError?.('No printer connected');
      return false;
    }
    
    setIsPrinting(true);
    try {
      console.log('[useZebraPrinter] Printing ZPL:', zpl);
      const result = await Zebra.printZPL({ zpl });
      
      if (result.success) {
        setError(null);
        return true;
      } else {
        setError(result.message);
        onError?.(result.message);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Print failed';
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [isConnected, onError]);

  const refreshStatus = useCallback(async (): Promise<void> => {
    if (!isConnected) return;
    
    try {
      const printerStatus = await Zebra.getPrinterStatus();
      setStatus(printerStatus);
    } catch (err) {
      console.error('[useZebraPrinter] Failed to get status:', err);
    }
  }, [isConnected]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const result = await Zebra.isPrinterConnected();
      setIsConnected(result.connected);
      
      if (!result.connected) {
        setConnectedPrinter(null);
        setStatus(null);
      }
      
      return result.connected;
    } catch (err) {
      setIsConnected(false);
      setConnectedPrinter(null);
      return false;
    }
  }, []);

  return {
    // State
    printers,
    connectedPrinter,
    isConnected,
    status,
    isPrinting,
    error,
    // Actions
    discoverPrinters,
    connect,
    disconnect,
    print,
    printZPL,
    refreshStatus,
    checkConnection,
  };
}

// ============================================================================
// USE ZEBRA COMBINED HOOK
// ============================================================================

/**
 * Combined React hook for Zebra scanner and printer
 * 
 * @param options - Configuration options
 * @returns Combined scanner and printer state and actions
 * 
 * @example
 * ```tsx
 * function ZebraApp() {
 *   const {
 *     // Scanner
 *     barcodes,
 *     isScanning,
 *     startScanning,
 *     stopScanning,
 *     // Printer
 *     printers,
 *     connect,
 *     printZPL,
 *     isConnected,
 *     // General
 *     isInitialized,
 *     isZebraDevice
 *   } = useZebra({
 *     autoStartScanning: true,
 *     autoDiscoverPrinters: true,
 *     onBarcodeScanned: (b) => console.log('Scanned:', b.data)
 *   });
 *   
 *   return (
 *     <div>
 *       {isZebraDevice ? 'Zebra Device' : 'Demo Mode'}
 *       ...
 *     </div>
 *   );
 * }
 * ```
 */
export function useZebra(options: UseZebraOptions = {}): UseZebraScannerReturn & UseZebraPrinterReturn & {
  /** Whether running on actual Zebra hardware */
  isZebraDevice: boolean;
  /** Combined loading state */
  isLoading: boolean;
} {
  const {
    autoStartScanning = false,
    autoDiscoverPrinters = false,
    maxBarcodeHistory = 50,
    onBarcodeScanned,
    onPrinterConnected,
    onPrinterDisconnected,
    onError,
  } = options;
  
  // Use individual hooks
  const scanner = useZebraScanner({
    maxBarcodeHistory,
    onBarcodeScanned,
    onError,
  });
  
  const printer = useZebraPrinter({
    autoDiscoverPrinters,
    onPrinterConnected,
    onPrinterDisconnected,
    onError,
  });
  
  // Auto-start scanning if enabled
  useEffect(() => {
    if (autoStartScanning && scanner.isInitialized && !scanner.isScanning) {
      scanner.startScanning();
    }
  }, [autoStartScanning, scanner.isInitialized, scanner.isScanning]);

  // Derived state
  const isZebraDevice = scanner.initResult?.isZebraDevice ?? false;
  const isLoading = !scanner.isInitialized;

  return {
    // Scanner state & actions
    ...scanner,
    // Printer state & actions
    ...printer,
    // Combined state
    isZebraDevice,
    isLoading,
  };
}

// Types are already exported inline above
// Functions are already exported inline above
