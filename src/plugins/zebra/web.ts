import type { ZebraPlugin, BarcodeResult, PrinterInfo, PrinterStatus, PrinterOptions, PrintOptions, InitResult } from './index';

type BarcodeCallback = (result: BarcodeResult) => void;
type EventCallback = (result: unknown) => void;

class ZebraWeb implements ZebraPlugin {
  private barcodeCallback: BarcodeCallback | null = null;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private scanning = false;
  private printers: PrinterInfo[] = [
    { name: 'Zebra ZD410', address: '192.168.1.100:9100', type: 'wifi', isOnline: true },
    { name: 'Zebra QLn320', address: '00:11:22:33:44:55', type: 'bluetooth', isOnline: true },
    { name: 'Zebra ZD620', address: '192.168.1.101:9100', type: 'wifi', isOnline: false },
  ];
  private connectedPrinter: PrinterInfo | null = null;
  private demoScanInterval: ReturnType<typeof setInterval> | null = null;

  async initialize(): Promise<InitResult> {
    console.log('[Zebra Web] Initializing...');
    
    // Simulate a brief initialization delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { 
      success: true, 
      message: 'Zebra SDK initialized (Web Demo Mode)',
      isZebraDevice: false,
      sdkAvailable: false,
      dataWedgeAvailable: false
    };
  }

  async startScanning(): Promise<{ success: boolean; mode?: string; message?: string }> {
    console.log('[Zebra Web] Starting barcode scanner...');
    this.scanning = true;
    
    // Simulate barcode scans every 3-5 seconds for demo
    if (this.demoScanInterval) {
      clearInterval(this.demoScanInterval);
    }
    
    this.demoScanInterval = setInterval(() => {
      if (this.scanning && this.barcodeCallback) {
        const demoBarcodes = [
          { data: 'DEMO-123456789', symbology: 'CODE128' },
          { data: '012345678901', symbology: 'UPC-A' },
          { data: '5901234123457', symbology: 'EAN-13' },
          { data: 'ABC1234567890', symbology: 'CODE39' },
          { data: '!ZEBRA-CONFIG-123', symbology: 'CODE128' },
          { data: 'QR-DATA-' + Date.now(), symbology: 'QR' },
        ];
        
        const randomBarcode = demoBarcodes[Math.floor(Math.random() * demoBarcodes.length)];
        
        this.barcodeCallback({
          data: randomBarcode.data,
          symbology: randomBarcode.symbology,
          timestamp: Date.now(),
          isSpecialZebra: this.detectSpecialZebraBarcode(randomBarcode.data),
        });
      }
    }, 3000 + Math.random() * 2000);

    return { success: true, mode: 'demo', message: 'Demo scanning started' };
  }

  async stopScanning(): Promise<{ success: boolean; message?: string }> {
    console.log('[Zebra Web] Stopping barcode scanner...');
    this.scanning = false;
    
    if (this.demoScanInterval) {
      clearInterval(this.demoScanInterval);
      this.demoScanInterval = null;
    }
    
    return { success: true, message: 'Scanning stopped' };
  }

  async addBarcodeListener(
    callback: (result: BarcodeResult) => void
  ): Promise<{ success: boolean }> {
    console.log('[Zebra Web] Adding barcode listener...');
    this.barcodeCallback = callback;
    
    // Also listen for keyboard input (simulating barcode scanner)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && this.barcodeCallback) {
        const input = (window as unknown as { __zebraInput?: string }).__zebraInput || '';
        if (input) {
          this.barcodeCallback({
            data: input,
            symbology: 'KEYBOARD',
            timestamp: Date.now(),
            isSpecialZebra: this.detectSpecialZebraBarcode(input),
          });
          (window as unknown as { __zebraInput?: string }).__zebraInput = '';
        }
      } else if (e.key.length === 1) {
        (window as unknown as { __zebraInput?: string }).__zebraInput = 
          ((window as unknown as { __zebraInput?: string }).__zebraInput || '') + e.key;
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return { success: true };
  }

  async removeBarcodeListener(): Promise<{ success: boolean }> {
    this.barcodeCallback = null;
    return { success: true };
  }

  async addListener(eventName: string, callback: (result: unknown) => void): Promise<{ success: boolean }> {
    console.log('[Zebra Web] Adding listener for:', eventName);
    
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName)?.push(callback);
    
    // For barcodeScanned event, set up the callback
    if (eventName === 'barcodeScanned') {
      this.barcodeCallback = callback as BarcodeCallback;
    }
    
    return { success: true };
  }

  async connectPrinter(options: PrinterOptions): Promise<{ success: boolean; message: string }> {
    console.log('[Zebra Web] Connecting to printer:', options);
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const printer = this.printers.find(p => p.address === options.address);
    if (printer) {
      this.connectedPrinter = printer;
      console.log('[Zebra Web] Connected to:', printer.name);
      return { success: true, message: `Connected to ${printer.name} (Demo)` };
    }
    
    // Allow connecting to any address in demo mode
    this.connectedPrinter = {
      name: options.name || 'Demo Printer',
      address: options.address,
      type: options.type || 'wifi',
      isOnline: true
    };
    
    return { success: true, message: `Connected to ${options.address} (Demo)` };
  }

  async disconnectPrinter(): Promise<{ success: boolean; message?: string }> {
    console.log('[Zebra Web] Disconnecting from printer...');
    this.connectedPrinter = null;
    return { success: true, message: 'Disconnected (Demo)' };
  }

  async print(options: PrintOptions): Promise<{ success: boolean; message: string }> {
    console.log('[Zebra Web] Printing:', options);
    
    if (!this.connectedPrinter) {
      return { success: false, message: 'No printer connected' };
    }
    
    // Simulate print delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('[Zebra Web] Print content:', options.content);
    console.log('[Zebra Web] Format:', options.format);
    console.log('[Zebra Web] Copies:', options.copies || 1);
    
    return { success: true, message: `Printed ${options.copies || 1} copy(ies) (Demo)` };
  }

  async printZPL(options: { zpl: string }): Promise<{ success: boolean; message: string }> {
    console.log('[Zebra Web] Printing ZPL:');
    console.log(options.zpl);
    
    if (!this.connectedPrinter) {
      return { success: false, message: 'No printer connected' };
    }
    
    // Simulate print delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Validate basic ZPL structure
    const zpl = options.zpl.trim();
    if (!zpl.startsWith('^XA') || !zpl.endsWith('^XZ')) {
      console.warn('[Zebra Web] ZPL may be malformed - missing ^XA or ^XZ');
    }
    
    return { success: true, message: 'ZPL sent to printer (Demo)' };
  }

  async discoverPrinters(): Promise<{ success: boolean; printers: PrinterInfo[]; message?: string }> {
    console.log('[Zebra Web] Discovering printers...');
    
    // Simulate discovery delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return demo printers with random online status
    const discoveredPrinters = this.printers.map(p => ({
      ...p,
      isOnline: Math.random() > 0.3 // 70% chance of being online
    }));
    
    console.log('[Zebra Web] Found', discoveredPrinters.length, 'printers');
    
    return { 
      success: true, 
      printers: discoveredPrinters,
      message: `Found ${discoveredPrinters.length} printer(s) (Demo)`
    };
  }

  async getPrinters(): Promise<{ printers: PrinterInfo[] }> {
    const result = await this.discoverPrinters();
    return { printers: result.printers };
  }

  async isPrinterConnected(): Promise<{ connected: boolean }> {
    return { connected: this.connectedPrinter !== null };
  }

  async getPrinterStatus(): Promise<PrinterStatus> {
    const isConnected = this.connectedPrinter !== null;
    
    return {
      isReady: isConnected,
      isPaused: false,
      isHeadOpen: false,
      isPaperOut: !isConnected,
      isRibbonOut: false,
      messages: isConnected 
        ? ['Printer ready (Demo)'] 
        : ['No printer connected'],
    };
  }

  private detectSpecialZebraBarcode(data: string): boolean {
    // Special Zebra barcode patterns
    const zebraPatterns = [
      /^!ZEBRA/i,
      /^\$ZEBRA/i,
      /^ZEBRA-CFG/i,
      /^~ZEBRA/i,
      /^\^ZEBRA/i,
      /ZEBRA.*CONFIG/i,
    ];
    
    return zebraPatterns.some(pattern => pattern.test(data));
  }
}

export default ZebraWeb;
