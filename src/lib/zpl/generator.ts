/**
 * @fileoverview ZPL (Zebra Programming Language) Generator
 * @module @zebra-app/zpl
 * 
 * A fluent API for generating ZPL code for Zebra label printers.
 * Supports text, barcodes, QR codes, boxes, and graphics.
 * 
 * @example
 * ```typescript
 * import { ZPL } from '@zebra-app/zpl';
 * 
 * const zpl = ZPL.create()
 *   .labelHome(0, 0)
 *   .barcode(50, 100, 'CODE128', 'ABC123', { height: 80 })
 *   .text(50, 200, 'Product Name', { fontSize: 24 })
 *   .build();
 * ```
 */

import type {
  LabelConfig,
  FieldOrigin,
  BarcodeFieldOptions,
  TextFieldOptions,
  QRCodeFieldOptions,
  BoxFieldOptions,
  LabelData,
  LabelTemplate,
} from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default label configuration */
export const DEFAULT_LABEL_CONFIG: LabelConfig = {
  width: 2,
  height: 1,
  unit: 'inch',
  density: 8,
  speed: 2,
};

/** Standard Zebra fonts */
export const FONTS = {
  A: { name: 'A', defaultHeight: 9, defaultWidth: 5 },   // 9x5 dots
  B: { name: 'B', defaultHeight: 11, defaultWidth: 7 },  // 11x7 dots
  C: { name: 'C', defaultHeight: 18, defaultWidth: 10 }, // 18x10 dots
  D: { name: 'D', defaultHeight: 21, defaultWidth: 13 }, // 21x13 dots
  E: { name: 'E', defaultHeight: 28, defaultWidth: 15 }, // 28x15 dots
  F: { name: 'F', defaultHeight: 26, defaultWidth: 13 }, // 26x13 dots
  G: { name: 'G', defaultHeight: 60, defaultWidth: 40 }, // 60x40 dots
  H: { name: 'H', defaultHeight: 21, defaultWidth: 13 }, // 21x13 dots (OCR)
} as const;

/** DPI settings for common densities */
export const DPI = {
  6: 152,  // 6 dpmm = ~152 dpi
  8: 203,  // 8 dpmm = 203 dpi (most common)
  12: 300, // 12 dpmm = 300 dpi
  24: 600, // 24 dpmm = 600 dpi
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert millimeters to dots
 */
export function mmToDots(mm: number, density: number = 8): number {
  return Math.round(mm * density);
}

/**
 * Convert inches to dots
 */
export function inchToDots(inches: number, density: number = 8): number {
  return Math.round(inches * density * 25.4 / 25.4);
}

/**
 * Escape special characters in ZPL field data
 */
export function escapeZPL(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\^/g, '\\^')
    .replace(/~/g, '\\~')
    .replace(/\n/g, '\\&');
}

/**
 * Generate field origin command (^FO)
 */
function fieldOrigin(origin: FieldOrigin): string {
  const justMap = { left: 0, center: 1, right: 2 };
  const justification = origin.justification 
    ? `,${justMap[origin.justification]}` 
    : '';
  return `^FO${origin.x},${origin.y}${justification}`;
}

// ============================================================================
// ZPL BUILDER CLASS
// ============================================================================

/**
 * Fluent ZPL builder class
 */
export class ZPLBuilder {
  private commands: string[] = [];
  private config: LabelConfig;
  private density: number;

  constructor(config: Partial<LabelConfig> = {}) {
    this.config = { ...DEFAULT_LABEL_CONFIG, ...config };
    this.density = this.config.density || 8;
    
    // Start label format
    this.commands.push('^XA');
    
    // Set label home
    this.commands.push('^LH0,0');
    
    // Set encoding to UTF-8
    this.commands.push('^CI28');
    
    // Set print width based on label width
    if (this.config.width && this.config.unit === 'inch') {
      const widthDots = inchToDots(this.config.width, this.density);
      this.commands.push(`^PW${widthDots}`);
    }
    
    // Set print speed if specified
    if (this.config.speed) {
      this.commands.push(`^PR${this.config.speed}`);
    }
  }

  // --------------------------------------------------------------------------
  // FIELD ORIGIN
  // --------------------------------------------------------------------------

  /**
   * Set field origin for subsequent commands
   */
  fieldOrigin(x: number, y: number, justification?: 'left' | 'center' | 'right'): this {
    const justMap = { left: 0, center: 1, right: 2 };
    const just = justification ? `,${justMap[justification]}` : '';
    this.commands.push(`^FO${x},${y}${just}`);
    return this;
  }

  // --------------------------------------------------------------------------
  // TEXT
  // --------------------------------------------------------------------------

  /**
   * Add text field
   * 
   * @example
   * ```typescript
   * zpl.text(50, 30, 'Hello World', { fontSize: 24, font: 'D' });
   * ```
   */
  text(x: number, y: number, data: string, options: Partial<TextFieldOptions> = {}): this {
    this.commands.push(`^FO${x},${y}`);
    
    const font = options.font || 'D';
    const height = options.fontHeight || 24;
    const width = options.fontWidth || height;
    
    // ^A font, height, width
    this.commands.push(`^A${font}N,${height},${width}`);
    
    // ^FD field data
    this.commands.push(`^FD${escapeZPL(data)}^FS`);
    
    return this;
  }

  /**
   * Add multiline text block
   */
  textBlock(x: number, y: number, width: number, maxLines: number, data: string, options: Partial<TextFieldOptions> = {}): this {
    this.commands.push(`^FO${x},${y}`);
    
    const font = options.font || 'D';
    const height = options.fontHeight || 24;
    const width_font = options.fontWidth || height;
    
    // ^A font
    this.commands.push(`^A${font}N,${height},${width_font}`);
    
    // ^FB field block - width, max lines, line spacing, justification
    this.commands.push(`^FB${width},${maxLines},0,L`);
    
    this.commands.push(`^FD${escapeZPL(data)}^FS`);
    
    return this;
  }

  // --------------------------------------------------------------------------
  // BARCODES
  // --------------------------------------------------------------------------

  /**
   * Add CODE128 barcode
   */
  barcode128(x: number, y: number, data: string, options: Partial<BarcodeFieldOptions> = {}): this {
    this.commands.push(`^FO${x},${y}`);
    
    const height = options.height || 80;
    const printText = options.printText !== false ? 'Y' : 'N';
    const narrowBar = options.narrowBarWidth || 2;
    
    // ^BC - Code 128 barcode
    // N = normal orientation, height, print text, no UCC check digit, no mode
    this.commands.push(`^BCN,${height},${printText},N,N`);
    this.commands.push(`^FD${data}^FS`);
    
    return this;
  }

  /**
   * Add CODE39 barcode
   */
  barcode39(x: number, y: number, data: string, options: Partial<BarcodeFieldOptions> = {}): this {
    this.commands.push(`^FO${x},${y}`);
    
    const height = options.height || 80;
    const printText = options.printText !== false ? 'Y' : 'N';
    const narrowBar = options.narrowBarWidth || 3;
    const wideBar = options.wideBarWidth || narrowBar * 3;
    
    // ^B3 - Code 39 barcode
    // N=normal, height, print text, check digit Y/N
    this.commands.push(`^B3N,Y,${height},${printText},N`);
    this.commands.push(`^FD${data}^FS`);
    
    return this;
  }

  /**
   * Add EAN-13 barcode
   */
  ean13(x: number, y: number, data: string, options: Partial<BarcodeFieldOptions> = {}): this {
    this.commands.push(`^FO${x},${y}`);
    
    const height = options.height || 80;
    const printText = options.printText !== false ? 'Y' : 'N';
    
    // ^BE - EAN-13 barcode
    this.commands.push(`^BEN,${height},${printText}`);
    this.commands.push(`^FD${data}^FS`);
    
    return this;
  }

  /**
   * Add UPC-A barcode
   */
  upca(x: number, y: number, data: string, options: Partial<BarcodeFieldOptions> = {}): this {
    this.commands.push(`^FO${x},${y}`);
    
    const height = options.height || 80;
    const printText = options.printText !== false ? 'Y' : 'N';
    
    // ^BU - UPC-A barcode
    this.commands.push(`^BUN,${height},${printText},Y`);
    this.commands.push(`^FD${data}^FS`);
    
    return this;
  }

  /**
   * Add generic barcode (auto-detect type)
   */
  barcode(x: number, y: number, type: string, data: string, options: Partial<BarcodeFieldOptions> = {}): this {
    switch (type.toUpperCase()) {
      case 'CODE128':
      case '128':
        return this.barcode128(x, y, data, options);
      case 'CODE39':
      case '39':
        return this.barcode39(x, y, data, options);
      case 'EAN13':
      case 'EAN-13':
        return this.ean13(x, y, data, options);
      case 'UPCA':
      case 'UPC-A':
        return this.upca(x, y, data, options);
      default:
        return this.barcode128(x, y, data, options);
    }
  }

  // --------------------------------------------------------------------------
  // QR CODE
  // --------------------------------------------------------------------------

  /**
   * Add QR code
   * 
   * @example
   * ```typescript
   * zpl.qrCode(50, 50, 'https://example.com', { magnification: 6 });
   * ```
   */
  qrCode(x: number, y: number, data: string, options: Partial<QRCodeFieldOptions> = {}): this {
    this.commands.push(`^FO${x},${y}`);
    
    const model = options.model || 2;
    const magnification = options.magnification || 3;
    const errorCorrection = options.errorCorrection || 'M';
    const mask = options.mask || 7;
    
    // ^BQ - QR code
    // N=normal, model, magnification, error correction, mask
    this.commands.push(`^BQN,${model},${magnification}`);
    this.commands.push(`^FD${errorCorrection}${data}^FS`);
    
    return this;
  }

  // --------------------------------------------------------------------------
  // GRAPHICS
  // --------------------------------------------------------------------------

  /**
   * Add box/rectangle
   */
  box(x: number, y: number, width: number, height: number, options: Partial<BoxFieldOptions> = {}): this {
    const thickness = options.thickness || 2;
    const color = options.color || 'B';
    const rounding = options.rounding || 0;
    
    if (rounding > 0) {
      // ^GB - graphic box with rounding
      this.commands.push(`^FO${x},${y}^GB${width},${height},${thickness},${color},${rounding}^FS`);
    } else {
      this.commands.push(`^FO${x},${y}^GB${width},${height},${thickness},${color}^FS`);
    }
    
    return this;
  }

  /**
   * Add horizontal line
   */
  line(x: number, y: number, length: number, thickness: number = 2): this {
    this.commands.push(`^FO${x},${y}^GB${length},${thickness},${thickness},B^FS`);
    return this;
  }

  /**
   * Add vertical line
   */
  vline(x: number, y: number, length: number, thickness: number = 2): this {
    this.commands.push(`^FO${x},${y}^GB${thickness},${length},${thickness},B^FS`);
    return this;
  }

  // --------------------------------------------------------------------------
  // RAW COMMANDS
  // --------------------------------------------------------------------------

  /**
   * Add raw ZPL command
   */
  raw(command: string): this {
    this.commands.push(command);
    return this;
  }

  /**
   * Add comment (ignored by printer)
   */
  comment(text: string): this {
    this.commands.push(`^FX${text}`);
    return this;
  }

  // --------------------------------------------------------------------------
  // OUTPUT
  // --------------------------------------------------------------------------

  /**
   * Build and return the complete ZPL string
   */
  build(): string {
    return [...this.commands, '^XZ'].join('\n');
  }

  /**
   * Get commands array
   */
  getCommands(): string[] {
    return [...this.commands];
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new ZPL builder instance
 */
export function createZPL(config?: Partial<LabelConfig>): ZPLBuilder {
  return new ZPLBuilder(config);
}

/**
 * Quick barcode label - just pass barcode text, get ZPL
 * This is the simplest way to generate a label
 * 
 * @example
 * ```typescript
 * const zpl = quickBarcode('123456789');
 * // Returns: ^XA^CI28^FO50,30^BCN,100,Y,N,N^FD123456789^FS^XZ
 * 
 * // Use with printZPL
 * await printZPL(quickBarcode('ABC123'));
 * ```
 */
export function quickBarcode(barcode: string): string {
  return `^XA^CI28^FO50,30^BCN,100,Y,N,N^FD${barcode}^FS^XZ`;
}

/**
 * Quick barcode label with custom options
 */
export function quickBarcodeLabel(barcode: string, options?: {
  /** X position in dots (default: 50) */
  x?: number;
  /** Y position in dots (default: 30) */
  y?: number;
  /** Barcode height in dots (default: 100) */
  height?: number;
  /** Show text below barcode (default: true) */
  showText?: boolean;
}): string {
  const x = options?.x ?? 50;
  const y = options?.y ?? 30;
  const height = options?.height ?? 100;
  const showText = options?.showText !== false ? 'Y' : 'N';
  
  return `^XA^CI28^FO${x},${y}^BCN,${height},${showText},N,N^FD${barcode}^FS^XZ`;
}

/**
 * Create a simple barcode label
 */
export function createBarcodeLabel(barcode: string, options: {
  x?: number;
  y?: number;
  height?: number;
  showText?: boolean;
  text?: string;
} = {}): string {
  return quickBarcodeLabel(barcode, options);
}

/**
 * Create a product label with barcode, name, and price
 */
export function createProductLabel(data: {
  barcode: string;
  productName?: string;
  price?: string;
  sku?: string;
}): string {
  let yPos = 30;
  
  const zpl = createZPL({ width: 3, height: 2, unit: 'inch' });
  
  // Product name
  if (data.productName) {
    zpl.text(30, yPos, data.productName, { fontHeight: 30, font: 'D' });
    yPos += 50;
  }
  
  // Barcode
  zpl.barcode128(30, yPos, data.barcode, { height: 80, printText: true });
  yPos += 120;
  
  // SKU and Price on same line
  if (data.sku) {
    zpl.text(30, yPos, `SKU: ${data.sku}`, { fontHeight: 18 });
  }
  if (data.price) {
    zpl.text(250, yPos, data.price, { fontHeight: 24, font: 'D' });
  }
  
  return zpl.build();
}

/**
 * Create a QR code label
 */
export function createQRLabel(data: string, options: {
  x?: number;
  y?: number;
  size?: number;
  label?: string;
} = {}): string {
  const x = options.x || 50;
  const y = options.y || 50;
  const size = options.size || 5;
  
  const zpl = createZPL();
  
  zpl.qrCode(x, y, data, { magnification: size });
  
  if (options.label) {
    zpl.text(x, y + size * 25 + 20, options.label, { fontHeight: 18 });
  }
  
  return zpl.build();
}

// ============================================================================
// LABEL TEMPLATES
// ============================================================================

/**
 * Pre-built label templates for common use cases
 */
export const LABEL_TEMPLATES: LabelTemplate[] = [
  {
    id: 'simple-barcode',
    name: 'Simple Barcode',
    config: { width: 2, height: 1, unit: 'inch', density: 8 },
    fields: [
      { name: 'barcode', label: 'Barcode', type: 'barcode', required: true },
    ],
    generate: (data) => createZPL()
      .barcode128(50, 30, data.barcode, { height: 60, printText: true })
      .build(),
  },
  {
    id: 'product-label',
    name: 'Product Label',
    config: { width: 3, height: 2, unit: 'inch', density: 8 },
    fields: [
      { name: 'barcode', label: 'Barcode', type: 'barcode', required: true },
      { name: 'productName', label: 'Product Name', type: 'text', required: true },
      { name: 'sku', label: 'SKU', type: 'text' },
      { name: 'price', label: 'Price', type: 'text' },
    ],
    generate: (data) => {
      let yPos = 20;
      const zpl = createZPL({ width: 3, height: 2, unit: 'inch' });
      
      if (data.productName) {
        zpl.text(30, yPos, data.productName, { fontHeight: 30, font: 'D' });
        yPos += 45;
      }
      
      zpl.barcode128(30, yPos, data.barcode, { height: 80, printText: true });
      yPos += 110;
      
      zpl.text(30, yPos, `SKU: ${data.sku || data.barcode}`, { fontHeight: 18 });
      
      if (data.price) {
        zpl.text(280, yPos - 10, data.price, { fontHeight: 28, font: 'D' });
      }
      
      return zpl.build();
    },
  },
  {
    id: 'inventory-label',
    name: 'Inventory Label',
    config: { width: 4, height: 2, unit: 'inch', density: 8 },
    fields: [
      { name: 'barcode', label: 'Barcode', type: 'barcode', required: true },
      { name: 'productName', label: 'Item Name', type: 'text' },
      { name: 'quantity', label: 'Quantity', type: 'number' },
      { name: 'sku', label: 'SKU', type: 'text' },
    ],
    generate: (data) => {
      const zpl = createZPL({ width: 4, height: 2, unit: 'inch' });
      
      zpl.text(20, 20, 'INVENTORY', { fontHeight: 24, font: 'D' });
      zpl.barcode128(20, 50, data.barcode, { height: 60, printText: true });
      zpl.text(20, 140, `Item: ${data.productName || 'N/A'}`, { fontHeight: 18 });
      zpl.text(20, 165, `Qty: ${data.quantity || '1'}`, { fontHeight: 18 });
      zpl.text(300, 165, `SKU: ${data.sku || data.barcode}`, { fontHeight: 18 });
      
      return zpl.build();
    },
  },
  {
    id: 'shipping-label',
    name: 'Shipping Label',
    config: { width: 4, height: 6, unit: 'inch', density: 8 },
    fields: [
      { name: 'barcode', label: 'Tracking #', type: 'barcode', required: true },
      { name: 'productName', label: 'Recipient', type: 'text' },
      { name: 'quantity', label: 'Package Count', type: 'number' },
    ],
    generate: (data) => {
      const zpl = createZPL({ width: 4, height: 6, unit: 'inch' });
      
      zpl.text(20, 20, 'SHIP TO:', { fontHeight: 36, font: 'D' });
      zpl.text(20, 70, data.productName || 'Recipient', { fontHeight: 28, font: 'D' });
      zpl.barcode128(20, 120, data.barcode, { height: 100, printText: true });
      zpl.text(20, 240, `Tracking: ${data.barcode}`, { fontHeight: 18 });
      zpl.text(20, 280, `Package: ${data.quantity || '1'}`, { fontHeight: 18 });
      
      return zpl.build();
    },
  },
  {
    id: 'qr-label',
    name: 'QR Code Label',
    config: { width: 2, height: 2, unit: 'inch', density: 8 },
    fields: [
      { name: 'barcode', label: 'QR Data', type: 'text', required: true },
      { name: 'productName', label: 'Label Text', type: 'text' },
    ],
    generate: (data) => {
      const zpl = createZPL({ width: 2, height: 2, unit: 'inch' });
      
      zpl.qrCode(50, 30, data.barcode, { magnification: 5 });
      
      if (data.productName) {
        zpl.text(50, 160, data.productName, { fontHeight: 18 });
      }
      
      return zpl.build();
    },
  },
];

/**
 * Get a template by ID
 */
export function getTemplate(id: string): LabelTemplate | undefined {
  return LABEL_TEMPLATES.find(t => t.id === id);
}

/**
 * Generate ZPL from a template and data
 */
export function generateFromTemplate(templateId: string, data: LabelData): string {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }
  return template.generate(data);
}
