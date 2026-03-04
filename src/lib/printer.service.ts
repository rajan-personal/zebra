/**
 * Printer Service - Zebra barcode printing only
 */

import { ZebraPlugin, type PrinterInfo } from '../plugins/zebra';

export type { PrinterInfo };

export class PrinterService {
  private connected = false;

  async discover(): Promise<PrinterInfo[]> {
    const result = await ZebraPlugin.discoverPrinters();
    return result.printers;
  }

  async connect(address: string): Promise<boolean> {
    const result = await ZebraPlugin.connectPrinter({ address });
    this.connected = result.success;
    return result.success;
  }

  async disconnect(): Promise<boolean> {
    const result = await ZebraPlugin.disconnectPrinter();
    this.connected = false;
    return result.success;
  }

  async printBarcode(data: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Printer not connected');
    }
    const zpl = `^XA^CI28^FO50,30^BCN,100,Y,N,N^FD${data}^FS^XZ`;
    const result = await ZebraPlugin.printZPL({ zpl });
    return result.success;
  }

  async printTestLabel(): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Printer not connected');
    }
    const zpl = `^XA
^FO50,50^ADN,36,20^FDTEST LABEL^FS
^FO50,100^BCN,100,Y,N,N^FDTEST123^FS
^FO50,220^ADN,18,10^FD${new Date().toLocaleString()}^FS
^XZ`;
    const result = await ZebraPlugin.printZPL({ zpl });
    return result.success;
  }

  getZPLPreviewUrl(data: string, width = 4, height = 2, dpi = 203): string {
    const zpl = `^XA^CI28^FO50,30^BCN,100,Y,N,N^FD${data}^FS^XZ`;
    const encodedZpl = encodeURIComponent(zpl);
    return `http://api.labelary.com/v1/printers/${dpi}dpmm/labels/${width}x${height}zpl=${encodedZpl}`;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
