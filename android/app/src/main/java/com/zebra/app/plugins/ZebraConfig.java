package com.zebra.app.plugins;

/**
 * Configuration constants for Zebra Plugin
 * 
 * Modify these values to customize the plugin behavior for your environment.
 * See README.md for documentation on each setting.
 */
public final class ZebraConfig {
    
    // Prevent instantiation
    private ZebraConfig() {}
    
    // ============================================
    // DEBUG SETTINGS
    // ============================================
    
    /** Enable/disable debug logging */
    public static final boolean DEBUG = true;
    
    /** Log tag for all plugin messages */
    public static final String LOG_TAG = "ZebraPlugin";
    
    // ============================================
    // DATAWEDGE SETTINGS
    // ============================================
    
    /** DataWedge API action for sending commands */
    public static final String DATAWEDGE_SEND_ACTION = "com.symbol.datawedge.api.ACTION";
    
    /** DataWedge intent action for receiving scan results */
    public static final String DATAWEDGE_SCAN_ACTION = "com.zebra.app.SCAN";
    
    /** DataWedge profile name for this app */
    public static final String DATAWEDGE_PROFILE_NAME = "ZebraApp";
    
    // ============================================
    // NETWORK PRINTER DISCOVERY SETTINGS
    // ============================================
    
    /** Port number for ZPL/raw printing (Zebra printers use 9100) */
    public static final int PRINTER_PORT = 9100;
    
    /** Number of threads for parallel network scanning */
    public static final int NETWORK_SCAN_THREADS = 64;
    
    /** Socket connection timeout in milliseconds (per IP) */
    public static final int SOCKET_TIMEOUT_MS = 1000;
    
    /** Maximum time to wait for network scan completion (seconds) */
    public static final int NETWORK_SCAN_TIMEOUT_SECONDS = 8;
    
    /** Host to ping for waking up WiFi radio */
    public static final String WIFI_WAKEUP_HOST = "google.com";
    
    /** Ping command arguments (format: ping -c <count> -W <timeout> <host>) */
    public static final String PING_COMMAND_FORMAT = "ping -c 1 -W 1 %s";
    
    // ============================================
    // ZEBRA DEVICE DETECTION
    // ============================================
    
    /** Zebra device model prefixes to check */
    public static final String[] ZEBRA_MODEL_PREFIXES = {
        "tc", "mc", "et", "zt", "zd", "ws"
    };
    
    /** Zebra manufacturer names to check */
    public static final String[] ZEBRA_MANUFACTURERS = {
        "zebra", "symbol"
    };
    
    // ============================================
    // SPECIAL BARCODE PATTERNS
    // ============================================
    
    /** Special Zebra configuration barcode patterns */
    public static final String[] ZEBRA_CONFIG_PATTERNS = {
        "!ZEBRA", "$ZEBRA", "ZEBRA-CFG", "~ZEBRA", "^ZEBRA"
    };
    
    // ============================================
    // SCAN SIMULATION SETTINGS (for non-Zebra devices)
    // ============================================
    
    /** Interval between simulated barcode scans (milliseconds) */
    public static final long SCAN_SIMULATION_INTERVAL_MS = 3000;
    
    /** Initial delay before starting scan simulation (milliseconds) */
    public static final long SCAN_SIMULATION_START_DELAY_MS = 2000;
    
    /** Socket timeout for ZPL printing (milliseconds) */
    public static final int PRINT_SOCKET_TIMEOUT_MS = 5000;
    
    /** Demo barcode prefixes for simulation */
    public static final String[] DEMO_BARCODE_PREFIXES = {
        "PROD-", "SKU", "ITEM-"
    };
}
