'use client';

import { useState, useEffect, useRef } from 'react';
import { ScannerService, PrinterService, type BarcodeResult, type PrinterInfo } from '@/lib';
import type { ScannerMode } from '@/lib/scanner.service';

export default function Home() {
  const scannerRef = useRef<ScannerService | null>(null);
  const printerRef = useRef<PrinterService | null>(null);
  const cameraPreviewId = useRef<string>('');
  
  const [isReady, setIsReady] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [barcodes, setBarcodes] = useState<BarcodeResult[]>([]);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    const init = async () => {
      const scanner = new ScannerService();
      const printer = new PrinterService();
      scannerRef.current = scanner;
      printerRef.current = printer;

      const result = await scanner.initialize();
      setIsReady(result.success);
      setScannerMode(scanner.getMode());
      setMessage(result.message);
      
      // Get camera preview ID for html5-qrcode
      cameraPreviewId.current = scanner.getCameraPreviewId() || '';

      scanner.onScan((barcode) => {
        setBarcodes(prev => [barcode, ...prev].slice(0, 20));
      });

      // Start printer discovery
      discoverPrinters();
    };
    
    init();

    return () => {
      scannerRef.current?.destroy();
    };
  }, []);

  const discoverPrinters = async () => {
    setIsDiscovering(true);
    setMessage('Scanning for printers...');
    
    const discovered = await printerRef.current?.discover() ?? [];
    console.log('discover() returned:', discovered);
    setPrinters(discovered);
    
    setTimeout(() => {
      setIsDiscovering(false);
      if (discovered.length === 0) {
        setMessage('No printers found. Enter IP manually.');
      } else {
        setMessage(`Found ${discovered.length} printer(s)`);
      }
    }, 2000);
  };

  const toggleScan = async () => {
    if (!scannerRef.current) return;
    
    if (isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    } else {
      const success = await scannerRef.current.start();
      setIsScanning(success);
      if (!success) {
        setMessage('Failed to start scanner. Check camera permission.');
      }
    }
  };

  const connectPrinter = async (address: string) => {
    if (!printerRef.current) return;
    setMessage('Connecting...');
    const success = await printerRef.current.connect(address);
    setIsConnected(success);
    setMessage(success ? 'Printer connected!' : 'Connection failed');
  };

  const printBarcode = async (data: string) => {
    if (!printerRef.current || !isConnected) {
      setMessage('No printer connected');
      return;
    }
    
    const success = await printerRef.current.printBarcode(data);
    setMessage(success ? 'Printed!' : 'Print failed');
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold">Zebra Scanner</h1>
          <p className="text-sm text-gray-400">
            {isReady ? (
              scannerMode === 'zebra' ? 'Zebra Scanner' : 'Camera Scanner'
            ) : 'Initializing...'}
            {isConnected && ' • Printer Connected'}
          </p>
        </header>

        {message && (
          <div className="bg-gray-700 p-3 rounded mb-4 text-center" onClick={() => setMessage('')}>
            {message}
          </div>
        )}

        {/* Camera Preview - html5-qrcode needs a div with id */}
        {scannerMode === 'camera' && (
          <div 
            id={cameraPreviewId.current}
            className={`bg-black rounded-lg mb-4 overflow-hidden ${isScanning ? 'block' : 'hidden'}`}
            style={{ minHeight: isScanning ? '200px' : '0' }}
          />
        )}

        {/* Scanner */}
        <button
          onClick={toggleScan}
          disabled={!isReady}
          className={`w-full py-4 rounded-lg font-bold mb-4 ${
            isScanning ? 'bg-red-600' : 'bg-blue-600'
          } disabled:opacity-50`}
        >
          {isScanning ? 'Stop Scanning' : 'Start Scanning'}
        </button>

        {/* Barcodes */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">Scanned ({barcodes.length})</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {barcodes.map((b, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                <span className="font-mono text-sm">{b.data}</span>
                {isConnected && (
                  <button
                    onClick={() => printBarcode(b.data)}
                    className="bg-green-600 px-2 py-1 rounded text-xs"
                  >
                    Print
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Printer */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Printer</h3>
            {!isConnected && (
              <button
                onClick={discoverPrinters}
                disabled={isDiscovering}
                className="text-xs bg-gray-600 px-2 py-1 rounded disabled:opacity-50"
              >
                {isDiscovering ? 'Scanning...' : 'Rescan'}
              </button>
            )}
          </div>
          
          {isConnected ? (
            <div className="space-y-2">
              <button
                onClick={async () => {
                  await printerRef.current?.disconnect();
                  setIsConnected(false);
                  setMessage('Disconnected');
                }}
                className="w-full py-2 bg-red-600 rounded"
              >
                Disconnect
              </button>
              <button
                onClick={async () => {
                  const success = await printerRef.current?.printTestLabel() ?? false;
                  setMessage(success ? 'Test label sent!' : 'Print failed');
                }}
                className="w-full py-2 bg-purple-600 rounded"
              >
                Print Test Label
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Manual IP input for Virtual ZPL Printer */}
              <input
                type="text"
                placeholder="Printer IP (e.g., 192.168.1.100:9100)"
                className="w-full py-2 px-3 bg-gray-700 rounded text-white text-sm"
                id="printer-ip-input"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('printer-ip-input') as HTMLInputElement;
                  const ip = input?.value?.trim();
                  if (ip) {
                    connectPrinter(ip);
                  } else {
                    setMessage('Please enter printer IP');
                  }
                }}
                className="w-full py-2 bg-blue-600 rounded"
              >
                Connect to IP
              </button>
              
              {/* Discovered printers */}
              {printers.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">Discovered Printers:</p>
                  {printers.map((p) => (
                    <button
                      key={p.address}
                      onClick={() => connectPrinter(p.address)}
                      className="w-full py-2 bg-gray-700 rounded hover:bg-gray-600 mb-1 text-sm"
                    >
                      {p.name}
                      <span className="text-gray-400 ml-1">({p.address})</span>
                    </button>
                  ))}
                </div>
              )}
              
              {printers.length === 0 && !isDiscovering && (
                <p className="text-gray-400 text-sm text-center">No printers discovered</p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
