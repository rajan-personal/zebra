'use client';

import { useState, useEffect } from 'react';
import { 
  useZebra, 
  ZPL, 
  ZPLBuilder,
  LABEL_TEMPLATES,
  type BarcodeResult,
  type PrinterInfo,
  type LabelData 
} from '@/lib';

export default function Home() {
  // Use the combined hook for all Zebra functionality
  const {
    // Scanner
    barcodes,
    isScanning,
    startScanning,
    stopScanning,
    toggleScanning,
    clearBarcodes,
    isInitialized,
    initResult,
    
    // Printer
    printers,
    connectedPrinter,
    isConnected,
    isPrinting,
    status: printerStatus,
    connect,
    disconnect,
    printZPL,
    discoverPrinters,
    
    // General
    isZebraDevice,
    error,
  } = useZebra({
    autoDiscoverPrinters: true,
    onBarcodeScanned: (barcode: BarcodeResult) => {
      // Auto-fill label data with scanned barcode
      setLabelData(prev => ({ ...prev, barcode: barcode.data }));
    },
    onError: (err) => {
      setMessage(err);
      setMessageType('error');
    },
  });
  
  // UI state
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [activeTab, setActiveTab] = useState<'scan' | 'print' | 'custom'>('scan');
  
  // Label printing state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('simple-barcode');
  const [labelData, setLabelData] = useState<LabelData>({
    barcode: '',
    productName: '',
    price: '',
    sku: '',
    quantity: '1'
  });
  const [printCopies, setPrintCopies] = useState(1);
  const [customZPL, setCustomZPL] = useState('');

  // Show message on initialization
  useEffect(() => {
    if (initResult) {
      setMessage(initResult.message);
      setMessageType(initResult.success ? 'success' : 'error');
    }
  }, [initResult]);

  // Show message helper
  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
  };

  // Connect to printer
  const connectToPrinter = async (printer: PrinterInfo) => {
    showMessage('Connecting to printer...', 'info');
    const success = await connect({
      address: printer.address,
      type: printer.type,
      name: printer.name,
    });
    
    if (success) {
      showMessage(`Connected to ${printer.name}`, 'success');
    } else {
      showMessage('Failed to connect', 'error');
    }
  };

  // Disconnect printer
  const disconnectPrinter = async () => {
    await disconnect();
    showMessage('Printer disconnected', 'info');
  };

  // Print label using template
  const printLabel = async () => {
    if (!isConnected) {
      showMessage('No printer connected', 'error');
      return;
    }
    
    if (!labelData.barcode) {
      showMessage('Please enter a barcode', 'error');
      return;
    }
    
    // Find template and generate ZPL
    const template = LABEL_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!template) {
      showMessage('Template not found', 'error');
      return;
    }
    
    const zpl = template.generate(labelData);
    
    // Print multiple copies
    for (let i = 0; i < printCopies; i++) {
      const success = await printZPL(zpl);
      if (!success) {
        showMessage(`Print failed on copy ${i + 1}`, 'error');
        return;
      }
    }
    
    showMessage(`Printed ${printCopies} label(s)`, 'success');
  };

  // Print custom ZPL
  const printCustomZPL = async () => {
    if (!isConnected) {
      showMessage('No printer connected', 'error');
      return;
    }
    
    if (!customZPL.trim()) {
      showMessage('Please enter ZPL code', 'error');
      return;
    }
    
    const success = await printZPL(customZPL);
    if (success) {
      showMessage('Custom ZPL printed', 'success');
    } else {
      showMessage('Failed to print', 'error');
    }
  };

  // Use scanned barcode
  const useScannedBarcode = (barcode: BarcodeResult) => {
    setLabelData(prev => ({ ...prev, barcode: barcode.data }));
    setActiveTab('print');
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Zebra Scanner & Printer</h1>
          <div className="flex items-center justify-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">
              {isZebraDevice ? 'Zebra Device' : 'Demo Mode'} 
              {isConnected && ' • Printer Connected'}
            </span>
          </div>
        </header>

        {/* Message Banner */}
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${
            messageType === 'success' ? 'bg-green-600' :
            messageType === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`} onClick={() => setMessage('')}>
            {message}
          </div>
        )}

        {/* Tab Navigation */}
        <nav className="flex gap-2 mb-4">
          {(['scan', 'print', 'custom'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab === 'scan' ? '📷 Scan' : tab === 'print' ? '🖨️ Print' : '📝 Custom ZPL'}
            </button>
          ))}
        </nav>

        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            <button
              onClick={toggleScanning}
              disabled={!isInitialized}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
                isScanning 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {isScanning ? '⏹️ Stop Scanning' : '📷 Start Scanning'}
            </button>

            <button
              onClick={clearBarcodes}
              className="w-full py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              Clear History ({barcodes.length} scans)
            </button>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Recent Scans</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {barcodes.length === 0 ? (
                  <p className="text-gray-400 text-sm">No barcodes scanned yet</p>
                ) : (
                  barcodes.map((barcode, index) => (
                    <div 
                      key={`${barcode.timestamp}-${index}`}
                      className={`p-3 rounded-lg ${
                        barcode.isSpecialZebra ? 'bg-yellow-900' : 'bg-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-sm">{barcode.data}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {barcode.symbology} • {new Date(barcode.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <button
                          onClick={() => useScannedBarcode(barcode)}
                          className="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-700"
                        >
                          Use
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Print Tab */}
        {activeTab === 'print' && (
          <div className="space-y-4">
            {/* Printer Selection */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Printer</h3>
              {isConnected ? (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{connectedPrinter?.name}</p>
                    <p className="text-sm text-gray-400">{connectedPrinter?.address}</p>
                  </div>
                  <button
                    onClick={disconnectPrinter}
                    className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={discoverPrinters}
                    className="w-full py-2 bg-blue-600 rounded hover:bg-blue-700"
                  >
                    🔍 Discover Printers
                  </button>
                  <div className="space-y-1">
                    {printers.map(printer => (
                      <button
                        key={printer.address}
                        onClick={() => connectToPrinter(printer)}
                        className="w-full p-2 bg-gray-700 rounded hover:bg-gray-600 text-left flex justify-between items-center"
                      >
                        <span>{printer.name}</span>
                        <span className="text-xs text-gray-400">{printer.address}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {printerStatus && (
                <div className="mt-3 p-2 bg-gray-700 rounded text-sm">
                  <p>Ready: {printerStatus.isReady ? '✅' : '❌'}</p>
                  {printerStatus.messages.length > 0 && (
                    <p className="text-yellow-400">{printerStatus.messages.join(', ')}</p>
                  )}
                </div>
              )}
            </div>

            {/* Template Selection */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Label Template</h3>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded text-white"
              >
                {LABEL_TEMPLATES.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.config.width}" x {template.config.height}")
                  </option>
                ))}
              </select>
            </div>

            {/* Label Data */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Label Data</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Barcode *"
                  value={labelData.barcode}
                  onChange={(e) => setLabelData(prev => ({ ...prev, barcode: e.target.value }))}
                  className="w-full p-2 bg-gray-700 rounded text-white"
                />
                <input
                  type="text"
                  placeholder="Product Name"
                  value={labelData.productName || ''}
                  onChange={(e) => setLabelData(prev => ({ ...prev, productName: e.target.value }))}
                  className="w-full p-2 bg-gray-700 rounded text-white"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="SKU"
                    value={labelData.sku || ''}
                    onChange={(e) => setLabelData(prev => ({ ...prev, sku: e.target.value }))}
                    className="p-2 bg-gray-700 rounded text-white"
                  />
                  <input
                    type="text"
                    placeholder="Price"
                    value={labelData.price || ''}
                    onChange={(e) => setLabelData(prev => ({ ...prev, price: e.target.value }))}
                    className="p-2 bg-gray-700 rounded text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Quantity"
                    value={labelData.quantity || ''}
                    onChange={(e) => setLabelData(prev => ({ ...prev, quantity: e.target.value }))}
                    className="p-2 bg-gray-700 rounded text-white"
                  />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Copies"
                    value={printCopies}
                    onChange={(e) => setPrintCopies(parseInt(e.target.value) || 1)}
                    className="p-2 bg-gray-700 rounded text-white"
                  />
                </div>
              </div>
            </div>

            {/* Print Button */}
            <button
              onClick={printLabel}
              disabled={!isConnected || isPrinting || !labelData.barcode}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
                isPrinting ? 'bg-yellow-600' : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50`}
            >
              {isPrinting ? '⏳ Printing...' : `🖨️ Print ${printCopies} Label(s)`}
            </button>
          </div>
        )}

        {/* Custom ZPL Tab */}
        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Custom ZPL Code</h3>
              <textarea
                value={customZPL}
                onChange={(e) => setCustomZPL(e.target.value)}
                placeholder="Enter ZPL code here..."
                className="w-full h-64 p-2 bg-gray-700 rounded text-white font-mono text-sm"
              />
            </div>

            <button
              onClick={printCustomZPL}
              disabled={!isConnected || isPrinting || !customZPL.trim()}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
                isPrinting ? 'bg-yellow-600' : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50`}
            >
              {isPrinting ? '⏳ Printing...' : '🖨️ Print ZPL'}
            </button>

            {/* ZPL Quick Reference */}
            <div className="bg-gray-800 rounded-lg p-4 text-sm">
              <h3 className="font-semibold mb-2">ZPL Quick Reference</h3>
              <pre className="text-gray-300 overflow-x-auto">
{`^XA                  Start label
^CI28                UTF-8 encoding
^FO50,30             Field origin (x,y)
^A@N,25,25,E:ARIAL   Font (height,width)
^FDHello World^FS    Field data & separator
^B3N,Y,80,N,N        Code 39 barcode
^BCN,80,Y,N,N        Code 128 barcode
^BQN,2,5             QR code (model, size)
^XZ                  End label`}
              </pre>
            </div>

            {/* Quick Templates */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Quick Templates</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCustomZPL(ZPL.barcode('123456789'))}
                  className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
                >
                  Simple Barcode
                </button>
                <button
                  onClick={() => setCustomZPL(ZPL.text('Hello World'))}
                  className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
                >
                  Text Only
                </button>
                <button
                  onClick={() => setCustomZPL(
                    new ZPLBuilder()
                      .text(50, 30, 'Sample Label', { fontHeight: 30 })
                      .barcode(50, 80, 'CODE128', 'ABC123', { height: 80 })
                      .build()
                  )}
                  className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
                >
                  Full Label
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-900 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
