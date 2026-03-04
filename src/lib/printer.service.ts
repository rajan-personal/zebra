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

  isConnected(): boolean {
    return this.connected;
  }
}
