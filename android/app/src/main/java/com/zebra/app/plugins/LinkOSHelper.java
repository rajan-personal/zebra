package com.zebra.app.plugins;

import android.content.Context;
import android.util.Log;

import com.zebra.sdk.comm.Connection;
import com.zebra.sdk.comm.ConnectionException;
import com.zebra.sdk.comm.TcpConnection;
import com.zebra.sdk.comm.BluetoothConnection;
import com.zebra.sdk.printer.ZebraPrinter;
import com.zebra.sdk.printer.ZebraPrinterFactory;
import com.zebra.sdk.printer.ZebraPrinterLanguageUnknownException;
import com.zebra.sdk.printer.PrinterStatus;
import com.zebra.sdk.printer.PrinterLanguage;
import com.zebra.sdk.printer.discovery.DiscoveredPrinter;
import com.zebra.sdk.printer.discovery.DiscoveredPrinterNetwork;
import com.zebra.sdk.printer.discovery.DiscoveryHandler;
import com.zebra.sdk.printer.discovery.NetworkDiscoverer;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Helper class for Zebra Link-OS SDK printer operations.
 * Provides network discovery, TCP/Bluetooth printing, and printer status.
 */
public class LinkOSHelper {
    private static final String TAG = ZebraConfig.LOG_TAG + ".LinkOS";
    private final Context context;
    private Connection printerConnection;
    private ZebraPrinter printer;
    private String connectedAddress;

    public LinkOSHelper(Context context) {
        this.context = context;
    }

    /**
     * Check if Link-OS SDK is available
     */
    public static boolean isSdkAvailable() {
        return true;
    }

    /**
     * Discover network printers using Link-OS SDK
     * Returns list of discovered printers with IP, port, and name
     */
    public JSONArray discoverNetworkPrinters() {
        final List<JSONObject> foundPrinters = new ArrayList<>();
        final CountDownLatch discoveryLatch = new CountDownLatch(1);

        DiscoveryHandler handler = new DiscoveryHandler() {
            @Override
            public void foundPrinter(DiscoveredPrinter discoveredPrinter) {
                try {
                    JSONObject printerInfo = new JSONObject();
                    printerInfo.put("address", discoveredPrinter.address);
                    
                    if (discoveredPrinter instanceof DiscoveredPrinterNetwork) {
                        DiscoveredPrinterNetwork networkPrinter = (DiscoveredPrinterNetwork) discoveredPrinter;
                        printerInfo.put("port", 9100); // Default ZPL port
                        printerInfo.put("type", "network");
                        printerInfo.put("name", discoveredPrinter.toString());
                    }
                    
                    foundPrinters.add(printerInfo);
                    Log.d(TAG, "Found network printer: " + discoveredPrinter.address);
                } catch (Exception e) {
                    Log.e(TAG, "Error processing discovered printer: " + e.getMessage());
                }
            }

            @Override
            public void discoveryFinished() {
                Log.d(TAG, "Network discovery finished. Found " + foundPrinters.size() + " printers");
                discoveryLatch.countDown();
            }

            @Override
            public void discoveryError(String message) {
                Log.e(TAG, "Discovery error: " + message);
                discoveryLatch.countDown();
            }
        };

        try {
            // Use local broadcast discovery
            NetworkDiscoverer.localBroadcast(handler);
            
            // Wait for discovery to complete (max 5 seconds)
            discoveryLatch.await(5, TimeUnit.SECONDS);
        } catch (Exception e) {
            Log.e(TAG, "Error during network discovery: " + e.getMessage());
        }

        return new JSONArray(foundPrinters);
    }

    /**
     * Connect to printer via TCP
     */
    public boolean connectTcp(String address, int port) {
        try {
            disconnect(); // Close any existing connection
            
            printerConnection = new TcpConnection(address, port);
            printerConnection.open();
            
            if (printerConnection.isConnected()) {
                printer = ZebraPrinterFactory.getInstance(printerConnection);
                connectedAddress = address;
                Log.d(TAG, "Connected to TCP printer: " + address + ":" + port);
                return true;
            }
        } catch (ConnectionException | ZebraPrinterLanguageUnknownException e) {
            Log.e(TAG, "TCP connection error: " + e.getMessage());
            disconnect();
        }
        return false;
    }

    /**
     * Connect to printer via Bluetooth
     */
    public boolean connectBluetooth(String macAddress) {
        try {
            disconnect(); // Close any existing connection
            
            printerConnection = new BluetoothConnection(macAddress);
            printerConnection.open();
            
            if (printerConnection.isConnected()) {
                printer = ZebraPrinterFactory.getInstance(printerConnection);
                connectedAddress = macAddress;
                Log.d(TAG, "Connected to Bluetooth printer: " + macAddress);
                return true;
            }
        } catch (ConnectionException | ZebraPrinterLanguageUnknownException e) {
            Log.e(TAG, "Bluetooth connection error: " + e.getMessage());
            disconnect();
        }
        return false;
    }

    /**
     * Disconnect from printer
     */
    public void disconnect() {
        if (printerConnection != null) {
            try {
                printerConnection.close();
                Log.d(TAG, "Disconnected from printer: " + connectedAddress);
            } catch (ConnectionException e) {
                Log.e(TAG, "Error disconnecting: " + e.getMessage());
            }
            printerConnection = null;
            printer = null;
            connectedAddress = null;
        }
    }

    /**
     * Check if connected to printer
     */
    public boolean isConnected() {
        return printerConnection != null && printerConnection.isConnected();
    }

    /**
     * Get current printer status
     */
    public JSONObject getPrinterStatus() {
        JSONObject status = new JSONObject();
        
        if (!isConnected() || printer == null) {
            return status;
        }

        try {
            PrinterStatus printerStatus = printer.getCurrentStatus();
            status.put("isReadyToPrint", printerStatus.isReadyToPrint);
            status.put("isPaused", printerStatus.isPaused);
            status.put("isHeadOpen", printerStatus.isHeadOpen);
            status.put("isPaperOut", printerStatus.isPaperOut);
            status.put("isRibbonOut", printerStatus.isRibbonOut);
            status.put("isReceiveBufferFull", printerStatus.isReceiveBufferFull);
            status.put("labelsRemainingInBatch", printerStatus.labelsRemainingInBatch);
        } catch (Exception e) {
            Log.e(TAG, "Error getting printer status: " + e.getMessage());
        }

        return status;
    }

    /**
     * Print ZPL data
     */
    public boolean printZPL(String zplData) {
        if (!isConnected()) {
            Log.e(TAG, "Not connected to printer");
            return false;
        }

        try {
            byte[] data = zplData.getBytes();
            printerConnection.write(data);
            Log.d(TAG, "ZPL printed successfully to " + connectedAddress);
            return true;
        } catch (ConnectionException e) {
            Log.e(TAG, "Error printing ZPL: " + e.getMessage());
            return false;
        }
    }

    /**
     * Get printer control language (ZPL or CPCL)
     */
    public String getPrinterLanguage() {
        if (!isConnected() || printer == null) {
            return "unknown";
        }

        try {
            PrinterLanguage language = printer.getPrinterControlLanguage();
            return language.toString();
        } catch (Exception e) {
            Log.e(TAG, "Error getting printer language: " + e.getMessage());
            return "unknown";
        }
    }

    /**
     * Get connected printer address
     */
    public String getConnectedAddress() {
        return connectedAddress;
    }

    /**
     * Destroy helper and cleanup resources
     */
    public void destroy() {
        disconnect();
    }
}
