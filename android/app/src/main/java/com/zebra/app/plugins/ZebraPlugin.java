package com.zebra.app.plugins;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import android.os.Handler;
import android.os.Looper;

/**
 * Capacitor plugin for Zebra barcode scanning and printing
 * 
 * Uses DataWedge intents for barcode scanning (works on all Zebra devices)
 * Printing works in demo mode without Zebra SDK (logs to console)
 * 
 * For full printing support, add Zebra Link-OS SDK JAR files to libs folder
 */
@CapacitorPlugin(
    name = "ZebraPlugin",
    permissions = {
        @Permission(alias = "bluetooth", strings = {
            Manifest.permission.BLUETOOTH,
            Manifest.permission.BLUETOOTH_ADMIN,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.BLUETOOTH_SCAN
        }),
        @Permission(alias = "network", strings = {
            Manifest.permission.ACCESS_NETWORK_STATE,
            Manifest.permission.ACCESS_WIFI_STATE
        }),
        @Permission(alias = "camera", strings = {
            Manifest.permission.CAMERA
        })
    }
)
public class ZebraPlugin extends Plugin {
    private static final String TAG = "ZebraPlugin";
    private static final boolean DEBUG = true;
    
    // DataWedge action and intent filters
    private static final String DATAWEDGE_SEND_ACTION = "com.symbol.datawedge.api.ACTION";
    private static final String DATAWEDGE_SCAN_ACTION = "com.zebra.app.SCAN";
    
    // Special Zebra barcode patterns
    private static final String[] ZEBRA_CONFIG_PATTERNS = {
        "!ZEBRA", "$ZEBRA", "ZEBRA-CFG", "~ZEBRA", "^ZEBRA"
    };
    
    // State
    private boolean isScanning = false;
    private BroadcastReceiver scanReceiver = null;
    private String connectedPrinterAddress = null;
    private String connectedPrinterName = null;
    private Handler mainHandler = null;
    private Runnable scanSimulationRunnable = null;
    private int scanCounter = 0;
    
    @Override
    public void load() {
        super.load();
        setupDataWedgeReceiver();
        mainHandler = new Handler(Looper.getMainLooper());
        Log.d(TAG, "ZebraPlugin loaded");
    }
    
    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        stopScanSimulation();
        if (scanReceiver != null && getContext() != null) {
            try {
                getContext().unregisterReceiver(scanReceiver);
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering receiver", e);
            }
        }
    }
    
    /**
     * Initialize the Zebra SDK
     */
    @PluginMethod
    public void initialize(PluginCall call) {
        JSObject result = new JSObject();
        
        try {
            Log.d(TAG, "=== ZEBRA PLUGIN LOG TEST ===");
            Log.i(TAG, "Initialization called");
            Log.w(TAG, "Testing log visibility");
            boolean isZebraDevice = isZebraDevice();
            
            if (isZebraDevice) {
                configureDataWedge();
                result.put("message", "Zebra device detected. DataWedge scanning enabled.");
            } else {
                result.put("message", "Non-Zebra device. Running in demo mode.");
            }
            
            result.put("success", true);
            result.put("isZebraDevice", isZebraDevice);
            result.put("sdkAvailable", false);
            result.put("dataWedgeAvailable", isZebraDevice);
            
            Log.d(TAG, "Initialization: " + result.toString());
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Initialization failed", e);
            result.put("success", false);
            result.put("message", "Initialization failed: " + e.getMessage());
            call.resolve(result);
        }
    }
    
    /**
     * Start barcode scanning
     */
    @PluginMethod
    public void startScanning(PluginCall call) {
        JSObject result = new JSObject();
        
        try {
            if (isZebraDevice()) {
                // Start DataWedge scanning via intent
                Intent intent = new Intent();
                intent.setAction(DATAWEDGE_SEND_ACTION);
                intent.putExtra("com.symbol.datawedge.api.SOFT_SCAN_TRIGGER", "START_SCANNING");
                getContext().sendBroadcast(intent);
                result.put("mode", "datawedge");
            } else {
                // Start simulation mode
                startScanSimulation();
                result.put("mode", "simulation");
            }
            
            isScanning = true;
            result.put("success", true);
            result.put("message", "Scanning started");
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error starting scan", e);
            result.put("success", false);
            result.put("message", "Error: " + e.getMessage());
            call.resolve(result);
        }
    }
    
    /**
     * Start simulated barcode scanning using Handler (main thread)
     */
    private void startScanSimulation() {
        stopScanSimulation(); // Stop any existing simulation
        
        Log.d(TAG, "Starting scan simulation");
        
        scanSimulationRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isScanning) {
                    return;
                }
                
                // Generate random barcodes
                String[] demoBarcodes = {
                    "PROD-" + String.format("%06d", ++scanCounter),
                    "SKU" + String.format("%09d", System.currentTimeMillis() % 1000000000),
                    "5901234" + String.format("%06d", scanCounter),
                    "ABC" + System.currentTimeMillis() % 100000,
                    "ITEM-" + String.format("%04d", scanCounter),
                };
                
                String[] symbologies = {"CODE128", "EAN-13", "CODE39", "UPC-A", "QR"};
                
                int index = scanCounter % demoBarcodes.length;
                String barcodeData = demoBarcodes[index];
                String symbology = symbologies[index];
                
                JSObject scanResult = new JSObject();
                scanResult.put("data", barcodeData);
                scanResult.put("symbology", symbology);
                scanResult.put("timestamp", System.currentTimeMillis());
                scanResult.put("isSpecialZebra", false);
                
                Log.d(TAG, "Simulated scan: " + barcodeData + " (" + symbology + ")");
                notifyListeners("barcodeScanned", scanResult);
                
                // Schedule next scan in 3 seconds
                if (isScanning && mainHandler != null) {
                    mainHandler.postDelayed(this, 3000);
                }
            }
        };
        
        // Start after 2 seconds
        if (mainHandler != null) {
            mainHandler.postDelayed(scanSimulationRunnable, 2000);
        }
    }
    
    /**
     * Stop simulated scanning
     */
    private void stopScanSimulation() {
        if (mainHandler != null && scanSimulationRunnable != null) {
            mainHandler.removeCallbacks(scanSimulationRunnable);
        }
        scanSimulationRunnable = null;
    }
    
    /**
     * Stop barcode scanning
     */
    @PluginMethod
    public void stopScanning(PluginCall call) {
        JSObject result = new JSObject();
        
        try {
            if (isZebraDevice()) {
                Intent intent = new Intent();
                intent.setAction(DATAWEDGE_SEND_ACTION);
                intent.putExtra("com.symbol.datawedge.api.SOFT_SCAN_TRIGGER", "STOP_SCANNING");
                getContext().sendBroadcast(intent);
            } else {
                stopScanSimulation();
            }
            
            isScanning = false;
            result.put("success", true);
            result.put("message", "Scanning stopped");
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping scan", e);
            result.put("success", false);
            call.resolve(result);
        }
    }
    
    /**
     * Add barcode listener - notifies on barcode scan
     */
    @PluginMethod
    public void addBarcodeListener(PluginCall call) {
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    /**
     * Remove barcode listener
     */
    @PluginMethod
    public void removeBarcodeListener(PluginCall call) {
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    /**
     * Generic add listener method
     */
    @PluginMethod
    public void addListener(PluginCall call) {
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    /**
     * Connect to a Zebra printer (demo mode)
     */
    @PluginMethod
    public void connectPrinter(PluginCall call) {
        String address = call.getString("address", "");
        String name = call.getString("name", "Printer");
        
        JSObject result = new JSObject();
        
        if (address.isEmpty()) {
            result.put("success", false);
            result.put("message", "Printer address is required");
            call.resolve(result);
            return;
        }
        
        // Demo mode - just store the connection info
        connectedPrinterAddress = address;
        connectedPrinterName = name;
        
        result.put("success", true);
        result.put("message", "Connected to " + name + " (Demo Mode)");
        call.resolve(result);
    }
    
    /**
     * Disconnect from current printer
     */
    @PluginMethod
    public void disconnectPrinter(PluginCall call) {
        connectedPrinterAddress = null;
        connectedPrinterName = null;
        
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("message", "Disconnected from printer");
        call.resolve(result);
    }
    
    /**
     * Print content to connected printer (demo mode)
     */
    @PluginMethod
    public void print(PluginCall call) {
        String content = call.getString("content", "");
        String format = call.getString("format", "text");
        int copies = call.getInt("copies", 1);
        
        JSObject result = new JSObject();
        
        if (connectedPrinterAddress == null) {
            result.put("success", false);
            result.put("message", "No printer connected");
            call.resolve(result);
            return;
        }
        
        // Demo mode - just log the print
        Log.d(TAG, "=== PRINT (Demo Mode) ===");
        Log.d(TAG, "Printer: " + connectedPrinterName + " (" + connectedPrinterAddress + ")");
        Log.d(TAG, "Format: " + format);
        Log.d(TAG, "Copies: " + copies);
        Log.d(TAG, "Content:\n" + content);
        Log.d(TAG, "========================");
        
        result.put("success", true);
        result.put("message", "Print job sent (Demo Mode - check logcat)");
        call.resolve(result);
    }
    
    /**
     * Print ZPL content directly (demo mode)
     */
    @PluginMethod
    public void printZPL(PluginCall call) {
        String zpl = call.getString("zpl", "");
        
        JSObject result = new JSObject();
        
        if (connectedPrinterAddress == null) {
            result.put("success", false);
            result.put("message", "No printer connected");
            call.resolve(result);
            return;
        }
        
        // Demo mode - just log the ZPL
        Log.d(TAG, "=== ZPL PRINT (Demo Mode) ===");
        Log.d(TAG, "Printer: " + connectedPrinterName + " (" + connectedPrinterAddress + ")");
        Log.d(TAG, "ZPL:\n" + zpl);
        Log.d(TAG, "=============================");
        
        result.put("success", true);
        result.put("message", "ZPL sent to printer (Demo Mode - check logcat)");
        call.resolve(result);
    }
    
    /**
     * Discover available printers (Bluetooth and Network)
     */
    @PluginMethod
    public void discoverPrinters(PluginCall call) {
        JSObject result = new JSObject();
        JSArray printersArray = new JSArray();
        
        try {
            // Get paired Bluetooth printers
            BluetoothManager bluetoothManager = (BluetoothManager) getContext()
                .getSystemService(Context.BLUETOOTH_SERVICE);
            BluetoothAdapter bluetoothAdapter = bluetoothManager.getAdapter();
            
            if (bluetoothAdapter != null && bluetoothAdapter.isEnabled()) {
                if (ActivityCompat.checkSelfPermission(getContext(), 
                    Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                    
                    Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
                    
                    for (BluetoothDevice device : pairedDevices) {
                        String name = device.getName();
                        // Include all Bluetooth devices - user can select
                        if (name != null) {
                            JSObject printerObj = new JSObject();
                            printerObj.put("name", name);
                            printerObj.put("address", device.getAddress());
                            printerObj.put("type", "bluetooth");
                            printerObj.put("isOnline", true);
                            printersArray.put(printerObj);
                        }
                    }
                }
            }
            
            // Add demo network printer
            JSObject wifiPrinter = new JSObject();
            wifiPrinter.put("name", "Zebra ZD410 (WiFi Demo)");
            wifiPrinter.put("address", "192.168.1.100:9100");
            wifiPrinter.put("type", "wifi");
            wifiPrinter.put("isOnline", true);
            printersArray.put(wifiPrinter);
            
            result.put("success", true);
            result.put("printers", printersArray);
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error discovering printers", e);
            result.put("success", false);
            result.put("message", "Discovery failed: " + e.getMessage());
            result.put("printers", printersArray);
            call.resolve(result);
        }
    }
    
    /**
     * Get list of available printers (legacy method)
     */
    @PluginMethod
    public void getPrinters(PluginCall call) {
        discoverPrinters(call);
    }
    
    /**
     * Check if printer is connected
     */
    @PluginMethod
    public void isPrinterConnected(PluginCall call) {
        JSObject result = new JSObject();
        result.put("connected", connectedPrinterAddress != null);
        call.resolve(result);
    }
    
    /**
     * Get printer status
     */
    @PluginMethod
    public void getPrinterStatus(PluginCall call) {
        JSObject result = new JSObject();
        
        if (connectedPrinterAddress == null) {
            result.put("isReady", false);
            result.put("isPaused", false);
            result.put("isHeadOpen", false);
            result.put("isPaperOut", true);
            result.put("isRibbonOut", false);
            
            JSArray messages = new JSArray();
            messages.put("No printer connected");
            result.put("messages", messages);
        } else {
            // Demo mode - always ready
            result.put("isReady", true);
            result.put("isPaused", false);
            result.put("isHeadOpen", false);
            result.put("isPaperOut", false);
            result.put("isRibbonOut", false);
            
            JSArray messages = new JSArray();
            messages.put("Printer ready (Demo Mode)");
            result.put("messages", messages);
        }
        
        call.resolve(result);
    }
    
    // Private helper methods
    
    private void setupDataWedgeReceiver() {
        scanReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                
                if (DATAWEDGE_SCAN_ACTION.equals(action)) {
                    // Handle scanned barcode from DataWedge
                    String barcodeData = intent.getStringExtra("com.symbol.datawedge.data_string");
                    String symbology = intent.getStringExtra("com.symbol.datawedge.label_type");
                    byte[] rawBytes = intent.getByteArrayExtra("com.symbol.datawedge.decode_data");
                    
                    if (barcodeData != null) {
                        JSObject scanResult = new JSObject();
                        scanResult.put("data", barcodeData);
                        scanResult.put("symbology", symbology != null ? symbology : "UNKNOWN");
                        scanResult.put("timestamp", System.currentTimeMillis());
                        scanResult.put("isSpecialZebra", isSpecialZebraBarcode(barcodeData));
                        
                        if (rawBytes != null) {
                            JSArray bytesArray = new JSArray();
                            for (byte b : rawBytes) {
                                bytesArray.put(b & 0xFF);
                            }
                            scanResult.put("rawBytes", bytesArray);
                        }
                        
                        Log.d(TAG, "Barcode scanned: " + barcodeData + " (" + symbology + ")");
                        notifyListeners("barcodeScanned", scanResult);
                    }
                }
            }
        };
        
        // Register receiver for scan events
        IntentFilter filter = new IntentFilter(DATAWEDGE_SCAN_ACTION);
        filter.addCategory(Intent.CATEGORY_DEFAULT);
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(scanReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(scanReceiver, filter);
        }
    }
    
    private void configureDataWedge() {
        try {
            // Create/update DataWedge profile for this app
            Bundle profileConfig = new Bundle();
            profileConfig.putString("PROFILE_NAME", "ZebraApp");
            profileConfig.putString("PROFILE_ENABLED", "true");
            profileConfig.putString("CONFIG_MODE", "CREATE_IF_NOT_EXIST");
            
            // Associate app with profile
            Bundle appConfig = new Bundle();
            appConfig.putString("PACKAGE_NAME", getContext().getPackageName());
            appConfig.putStringArray("ACTIVITY_LIST", new String[]{"*"});
            profileConfig.putParcelableArray("APP_LIST", new Bundle[]{appConfig});
            
            Intent profileIntent = new Intent();
            profileIntent.setAction(DATAWEDGE_SEND_ACTION);
            profileIntent.putExtra("com.symbol.datawedge.api.SET_CONFIG", profileConfig);
            getContext().sendBroadcast(profileIntent);
            
            // Configure intent output for barcode data
            Bundle intentConfig = new Bundle();
            intentConfig.putString("PROFILE_NAME", "ZebraApp");
            intentConfig.putString("PLUGIN_NAME", "INTENT");
            intentConfig.putString("RESET_CONFIG", "false");
            
            Bundle intentParams = new Bundle();
            intentParams.putString("intent_output_enabled", "true");
            intentParams.putString("intent_action", DATAWEDGE_SCAN_ACTION);
            intentParams.putString("intent_delivery", "2"); // Broadcast intent
            
            intentConfig.putBundle("PARAM_LIST", intentParams);
            
            Intent configIntent = new Intent();
            configIntent.setAction(DATAWEDGE_SEND_ACTION);
            configIntent.putExtra("com.symbol.datawedge.api.SET_CONFIG", intentConfig);
            getContext().sendBroadcast(configIntent);
            
            Log.d(TAG, "DataWedge profile configured");
        } catch (Exception e) {
            Log.e(TAG, "Error configuring DataWedge", e);
        }
    }
    
    private boolean isZebraDevice() {
        try {
            // Check for Zebra EMDK feature
            if (getContext().getPackageManager().hasSystemFeature("com.symbol.emdk")) {
                Log.d(TAG, "Detected Zebra device via EMDK feature");
                return true;
            }
            
            // Check manufacturer
            String manufacturer = android.os.Build.MANUFACTURER.toLowerCase();
            if (manufacturer.contains("zebra") || manufacturer.contains("symbol")) {
                Log.d(TAG, "Detected Zebra device via manufacturer: " + manufacturer);
                return true;
            }
            
            // Check device model
            String model = android.os.Build.MODEL.toLowerCase();
            if (model.contains("tc") || model.contains("mc") || model.contains("et") || 
                model.contains("zt") || model.contains("zd") || model.contains("ws")) {
                Log.d(TAG, "Detected Zebra device via model: " + model);
                return true;
            }
            
            // Check brand
            String brand = android.os.Build.BRAND.toLowerCase();
            if (brand.contains("zebra") || brand.contains("symbol")) {
                Log.d(TAG, "Detected Zebra device via brand: " + brand);
                return true;
            }
            
            // Check if DataWedge is installed
            try {
                Intent intent = new Intent(DATAWEDGE_SEND_ACTION);
                List<android.content.pm.ResolveInfo> info = getContext().getPackageManager()
                    .queryIntentActivities(intent, 0);
                if (info != null && !info.isEmpty()) {
                    Log.d(TAG, "Detected Zebra device via DataWedge presence");
                    return true;
                }
            } catch (Exception e) {
                // Ignore
            }
            
            Log.d(TAG, "Not a Zebra device. Manufacturer: " + manufacturer + ", Model: " + model + ", Brand: " + brand);
            return false;
        } catch (Exception e) {
            Log.e(TAG, "Error checking Zebra device", e);
            return false;
        }
    }
    
    private boolean isSpecialZebraBarcode(String data) {
        if (data == null) return false;
        
        String upperData = data.toUpperCase();
        for (String pattern : ZEBRA_CONFIG_PATTERNS) {
            if (upperData.startsWith(pattern.toUpperCase())) {
                return true;
            }
        }
        
        return upperData.contains("ZEBRA") && upperData.contains("CONFIG");
    }
}
