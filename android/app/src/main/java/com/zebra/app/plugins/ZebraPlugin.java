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

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.util.List;
import java.util.Set;
import java.net.Socket;
import java.io.OutputStream;
import java.util.concurrent.Executors;

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
    // Shorthand reference to config
    private static final String TAG = ZebraConfig.LOG_TAG;
    
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
                intent.setAction(ZebraConfig.DATAWEDGE_SEND_ACTION);
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
                
                // Generate random barcodes using config prefixes
                String[] demoBarcodes = {
                    ZebraConfig.DEMO_BARCODE_PREFIXES[0] + String.format("%06d", ++scanCounter),
                    ZebraConfig.DEMO_BARCODE_PREFIXES[1] + String.format("%09d", System.currentTimeMillis() % 1000000000),
                    "5901234" + String.format("%06d", scanCounter),
                    "ABC" + System.currentTimeMillis() % 100000,
                    ZebraConfig.DEMO_BARCODE_PREFIXES[2] + String.format("%04d", scanCounter),
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
                
                // Schedule next scan
                if (isScanning && mainHandler != null) {
                    mainHandler.postDelayed(this, ZebraConfig.SCAN_SIMULATION_INTERVAL_MS);
                }
            }
        };
        
        // Start after configured delay
        if (mainHandler != null) {
            mainHandler.postDelayed(scanSimulationRunnable, ZebraConfig.SCAN_SIMULATION_START_DELAY_MS);
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
                intent.setAction(ZebraConfig.DATAWEDGE_SEND_ACTION);
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
     * Print ZPL content directly via TCP socket
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
        
        // Send ZPL via TCP socket in background thread
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                String host = connectedPrinterAddress;
                int port = 9100;
                
                // Parse host:port format
                if (connectedPrinterAddress.contains(":")) {
                    String[] parts = connectedPrinterAddress.split(":");
                    host = parts[0];
                    port = Integer.parseInt(parts[1]);
                }
                
                Log.d(TAG, "Connecting to " + host + ":" + port);
                
                Socket socket = new Socket(host, port);
                socket.setSoTimeout(ZebraConfig.PRINT_SOCKET_TIMEOUT_MS);
                
                OutputStream outputStream = socket.getOutputStream();
                outputStream.write(zpl.getBytes("UTF-8"));
                outputStream.flush();
                socket.close();
                
                Log.d(TAG, "ZPL sent successfully to " + host + ":" + port);
                
                JSObject successResult = new JSObject();
                successResult.put("success", true);
                successResult.put("message", "ZPL sent to printer");
                call.resolve(successResult);
                
            } catch (Exception e) {
                Log.e(TAG, "Failed to send ZPL", e);
                JSObject errorResult = new JSObject();
                errorResult.put("success", false);
                errorResult.put("message", "Print failed: " + e.getMessage());
                call.resolve(errorResult);
            }
        });
    }
    
    /**
     * Discover available printers (Bluetooth and Network)
     * Waits for network scan to complete before returning
     */
    @PluginMethod
    public void discoverPrinters(PluginCall call) {
        Log.d(TAG, "=== discoverPrinters CALLED ===");
        
        // Run discovery on background thread and wait for completion
        Executors.newSingleThreadExecutor().execute(() -> {
            JSObject result = new JSObject();
            JSArray printersArray = new JSArray();
            
            // Show toast
            showToast("Scanning for printers...");
            
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
                            if (name != null) {
                                JSObject printerObj = new JSObject();
                                printerObj.put("name", name);
                                printerObj.put("address", device.getAddress());
                                printerObj.put("type", "bluetooth");
                                printerObj.put("isOnline", true);
                                printersArray.put(printerObj);
                                Log.d(TAG, "Found BT printer: " + name);
                            }
                        }
                    }
                }
                
                // Run network discovery synchronously
                discoverNetworkPrintersSync(printersArray);
                
                result.put("success", true);
                result.put("printers", printersArray);
                result.put("message", "Found " + printersArray.length() + " printer(s)");
                
                Log.d(TAG, "discoverPrinters returning " + printersArray.length() + " printers");
                
                // Resolve on main thread
                mainHandler.post(() -> call.resolve(result));
                
            } catch (Exception e) {
                Log.e(TAG, "Error discovering printers", e);
                result.put("success", false);
                result.put("message", "Discovery failed: " + e.getMessage());
                result.put("printers", printersArray);
                mainHandler.post(() -> call.resolve(result));
            }
        });
    }
    
    private void showToast(final String message) {
        mainHandler.post(() -> {
            android.widget.Toast.makeText(getContext(), message, android.widget.Toast.LENGTH_SHORT).show();
        });
    }
    
    /**
     * Discover network printers synchronously - blocks until scan completes
     */
    private void discoverNetworkPrintersSync(JSArray printersArray) {
        try {
            showToast("Waking up WiFi...");
            
            // === WAKE UP WIFI RADIO ===
            try {
                String gateway = getGatewayIp();
                if (gateway != null) {
                    Log.d(TAG, "Pinging gateway " + gateway + " to wake WiFi");
                    Process ping = Runtime.getRuntime().exec(String.format(ZebraConfig.PING_COMMAND_FORMAT, gateway));
                    ping.waitFor();
                }
            } catch (Exception e) {
                Log.d(TAG, "Ping failed (ok): " + e.getMessage());
            }
            
            // Also do a DNS lookup to wake network
            try {
                java.net.InetAddress.getByName(ZebraConfig.WIFI_WAKEUP_HOST);
            } catch (Exception e) {
                // Ignore
            }
            
            showToast("Starting network scan...");
            
            // Get local IP and subnet
            String localIp = null;
            
            java.util.Enumeration<java.net.NetworkInterface> interfaces = 
                java.net.NetworkInterface.getNetworkInterfaces();
                
            while (interfaces.hasMoreElements()) {
                java.net.NetworkInterface iface = interfaces.nextElement();
                String ifaceName = iface.getName();
                boolean isUp = iface.isUp();
                
                Log.d(TAG, "Interface: " + ifaceName + " up=" + isUp);
                
                // Check all UP interfaces for IPv4 addresses (broader search)
                if (isUp && !ifaceName.equals("lo")) {
                    java.util.Enumeration<java.net.InetAddress> addresses = iface.getInetAddresses();
                    while (addresses.hasMoreElements()) {
                        java.net.InetAddress addr = addresses.nextElement();
                        if (addr instanceof java.net.Inet4Address && !addr.isLoopbackAddress()) {
                            localIp = addr.getHostAddress();
                            Log.d(TAG, "Found IP: " + localIp + " on " + ifaceName);
                            break;
                        }
                    }
                }
                if (localIp != null) break;
            }
            
            if (localIp == null) {
                Log.e(TAG, "No network interface found");
                showToast("No WiFi network found");
                return;
            }
            
            showToast("My IP: " + localIp);
            Log.d(TAG, "Local IP: " + localIp);
            
            // Get subnet prefix (e.g., 192.168.1)
            String[] parts = localIp.split("\\.");
            if (parts.length != 4) {
                showToast("Invalid IP format: " + localIp);
                return;
            }
            
            final String subnet = parts[0] + "." + parts[1] + "." + parts[2];
            final String myIp = localIp;
            
            Log.d(TAG, "Scanning subnet: " + subnet + ".*");
            showToast("Scanning " + subnet + ".1-254");
            
            // Use thread pool for parallel scanning
            java.util.concurrent.ExecutorService scanner = Executors.newFixedThreadPool(ZebraConfig.NETWORK_SCAN_THREADS);
            final java.util.concurrent.atomic.AtomicInteger foundCount = new java.util.concurrent.atomic.AtomicInteger(0);
            final JSArray finalPrintersArray = printersArray;
            
            for (int i = 1; i <= 254; i++) {
                final String ip = subnet + "." + i;
                if (ip.equals(myIp)) continue; // Skip own IP
                
                scanner.execute(() -> {
                    if (checkPrinterAtIPSync(ip, finalPrintersArray)) {
                        foundCount.incrementAndGet();
                    }
                });
            }
            
            // Wait for all scans to complete
            scanner.shutdown();
            scanner.awaitTermination(ZebraConfig.NETWORK_SCAN_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);
            
            final int count = foundCount.get();
            Log.d(TAG, "Network scan complete. Found: " + count);
            showToast("Found " + count + " network printer(s)");
            
        } catch (Exception e) {
            Log.e(TAG, "Network discovery error", e);
            showToast("Scan error: " + e.getMessage());
        }
    }
    
    private boolean checkPrinterAtIPSync(String ip, JSArray printersArray) {
        try {
            Socket socket = new Socket();
            socket.connect(new java.net.InetSocketAddress(ip, ZebraConfig.PRINTER_PORT), ZebraConfig.SOCKET_TIMEOUT_MS);
            socket.close();
            
            Log.d(TAG, "Found printer at " + ip + ":" + ZebraConfig.PRINTER_PORT);
            
            JSObject printerObj = new JSObject();
            printerObj.put("name", "Network Printer (" + ip + ")");
            printerObj.put("address", ip + ":" + ZebraConfig.PRINTER_PORT);
            printerObj.put("type", "network");
            printerObj.put("isOnline", true);
            printersArray.put(printerObj);
            
            return true;
            
        } catch (Exception e) {
            // Printer not found at this IP, ignore
            return false;
        }
    }
    
    /**
     * Get the WiFi gateway IP address
     */
    private String getGatewayIp() {
        try {
            android.net.wifi.WifiManager wifiManager = (android.net.wifi.WifiManager) 
                getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            android.net.DhcpInfo dhcpInfo = wifiManager.getDhcpInfo();
            if (dhcpInfo != null) {
                int gateway = dhcpInfo.gateway;
                // Convert from int to IP string
                return String.format("%d.%d.%d.%d",
                    (gateway & 0xff),
                    (gateway >> 8 & 0xff),
                    (gateway >> 16 & 0xff),
                    (gateway >> 24 & 0xff));
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting gateway: " + e.getMessage());
        }
        return null;
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
                
                if (ZebraConfig.DATAWEDGE_SCAN_ACTION.equals(action)) {
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
        IntentFilter filter = new IntentFilter(ZebraConfig.DATAWEDGE_SCAN_ACTION);
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
            profileConfig.putString("PROFILE_NAME", ZebraConfig.DATAWEDGE_PROFILE_NAME);
            profileConfig.putString("PROFILE_ENABLED", "true");
            profileConfig.putString("CONFIG_MODE", "CREATE_IF_NOT_EXIST");
            
            // Associate app with profile
            Bundle appConfig = new Bundle();
            appConfig.putString("PACKAGE_NAME", getContext().getPackageName());
            appConfig.putStringArray("ACTIVITY_LIST", new String[]{"*"});
            profileConfig.putParcelableArray("APP_LIST", new Bundle[]{appConfig});
            
            Intent profileIntent = new Intent();
            profileIntent.setAction(ZebraConfig.DATAWEDGE_SEND_ACTION);
            profileIntent.putExtra("com.symbol.datawedge.api.SET_CONFIG", profileConfig);
            getContext().sendBroadcast(profileIntent);
            
            // Configure intent output for barcode data
            Bundle intentConfig = new Bundle();
            intentConfig.putString("PROFILE_NAME", ZebraConfig.DATAWEDGE_PROFILE_NAME);
            intentConfig.putString("PLUGIN_NAME", "INTENT");
            intentConfig.putString("RESET_CONFIG", "false");
            
            Bundle intentParams = new Bundle();
            intentParams.putString("intent_output_enabled", "true");
            intentParams.putString("intent_action", ZebraConfig.DATAWEDGE_SCAN_ACTION);
            intentParams.putString("intent_delivery", "2"); // Broadcast intent
            
            intentConfig.putBundle("PARAM_LIST", intentParams);
            
            Intent configIntent = new Intent();
            configIntent.setAction(ZebraConfig.DATAWEDGE_SEND_ACTION);
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
            for (String zebraMfr : ZebraConfig.ZEBRA_MANUFACTURERS) {
                if (manufacturer.contains(zebraMfr)) {
                    Log.d(TAG, "Detected Zebra device via manufacturer: " + manufacturer);
                    return true;
                }
            }
            
            // Check device model
            String model = android.os.Build.MODEL.toLowerCase();
            for (String prefix : ZebraConfig.ZEBRA_MODEL_PREFIXES) {
                if (model.contains(prefix)) {
                    Log.d(TAG, "Detected Zebra device via model: " + model);
                    return true;
                }
            }
            
            // Check brand
            String brand = android.os.Build.BRAND.toLowerCase();
            for (String zebraMfr : ZebraConfig.ZEBRA_MANUFACTURERS) {
                if (brand.contains(zebraMfr)) {
                    Log.d(TAG, "Detected Zebra device via brand: " + brand);
                    return true;
                }
            }
            
            // Check if DataWedge is installed
            try {
                Intent intent = new Intent(ZebraConfig.DATAWEDGE_SEND_ACTION);
                List<android.content.pm.ResolveInfo> info = getContext().getPackageManager()
                    .queryIntentActivities(intent, 0);
                if (info != null && !info.isEmpty()) {
                    Log.d(TAG, "Detected Zebra device via DataWedge presence");
                    return true;
                }
            } catch (Exception e) {
                // Ignore
            }
            
            Log.d(TAG, "Not a Zebra device. Manufacturer: " + manufacturer + 
                ", Model: " + model + ", Brand: " + brand);
            return false;
        } catch (Exception e) {
            Log.e(TAG, "Error checking Zebra device", e);
            return false;
        }
    }
    
    private boolean isSpecialZebraBarcode(String data) {
        if (data == null) return false;
        
        String upperData = data.toUpperCase();
        for (String pattern : ZebraConfig.ZEBRA_CONFIG_PATTERNS) {
            if (upperData.startsWith(pattern.toUpperCase())) {
                return true;
            }
        }
        
        return upperData.contains("ZEBRA") && upperData.contains("CONFIG");
    }
}
