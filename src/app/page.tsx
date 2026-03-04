'use client';

import { useState, useEffect, useRef } from 'react';
import { ScannerService, PrinterService, type BarcodeResult, type PrinterInfo } from '@/lib';

export default function Home() {
  const scannerRef = useRef<ScannerService | null>(null);
  const printerRef = useRef<PrinterService | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isZebra, setIsZebra] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [barcodes, setBarcodes] = useState<BarcodeResult[]>([]);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const scanner = new ScannerService();
    const printer = new PrinterService();
    scannerRef.current = scanner;
    printerRef.current = printer;

    scanner.initialize().then((result) => {
      setIsReady(result.success);
      setIsZebra(result.isZebraDevice ?? false);
      setMessage(result.message);

      scanner.onScan((barcode) => {
        setBarcodes(prev => [barcode, ...prev].slice(0, 20));
      });

      printer.discover().then(setPrinters);
    });

    return () => {
      scanner.destroy();
    };
  }, []);

  const toggleScan = async () => {
    if (!scannerRef.current) return;
    
    if (isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    } else {
      const success = await scannerRef.current.start();
      setIsScanning(success);
    }
  };

  const connectPrinter = async (address: string) => {
    if (!printerRef.current) return;
    const success = await printerRef.current.connect(address);
    setIsConnected(success);
    setMessage(success ? 'Printer connected' : 'Connection failed');
  };

  const printBarcode = async (data: string) => {
    if (!printerRef.current || !isConnected) {
      setMessage('No printer connected');
      return;
    }
    
    const success = await printerRef.current.printBarcode(data);
    setMessage(success ? 'Printed' : 'Print failed');
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold">Zebra Scanner</h1>
          <p className="text-sm text-gray-400">
            {isReady ? (isZebra ? 'Zebra Device' : 'Demo Mode') : 'Initializing...'}
            {isConnected && ' • Printer Connected'}
          </p>
        </header>

        {message && (
          <div className="bg-gray-700 p-3 rounded mb-4 text-center" onClick={() => setMessage('')}>
            {message}
          </div>
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
          <h3 className="font-semibold mb-2">Printer</h3>
          {isConnected ? (
            <button
              onClick={async () => {
                await printerRef.current?.disconnect();
                setIsConnected(false);
              }}
              className="w-full py-2 bg-red-600 rounded"
            >
              Disconnect
            </button>
          ) : (
            <div className="space-y-2">
              {printers.map((p) => (
                <button
                  key={p.address}
                  onClick={() => connectPrinter(p.address)}
                  className="w-full py-2 bg-gray-700 rounded hover:bg-gray-600"
                >
                  {p.name}
                </button>
              ))}
              {printers.length === 0 && (
                <p className="text-gray-400 text-sm text-center">No printers found</p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
