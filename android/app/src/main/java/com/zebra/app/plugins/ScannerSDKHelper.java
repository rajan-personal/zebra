package com.zebra.app.plugins;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.zebra.scannercontrol.DCSSDKDefs;
import com.zebra.scannercontrol.DCSScannerInfo;
import com.zebra.scannercontrol.IDcsSdkApiDelegate;
import com.zebra.scannercontrol.SDKHandler;

import java.util.ArrayList;
import java.util.List;

/**
 * Zebra Scanner SDK integration for Bluetooth cordless scanners
 * 
 * Supports scanners like CS60, DS36, RS51, etc. that connect via Bluetooth
 * without a cradle.
 * 
 * SDK from: https://github.com/ZebraDevs/Scanner-SDK-for-Android
 */
public class ScannerSDKHelper implements IDcsSdkApiDelegate {
    private static final String TAG = ZebraConfig.LOG_TAG;
    
    private Context context;
    private SDKHandler sdkHandler;
    private boolean isInitialized = false;
    private int connectedScannerId = -1;
    private String connectedScannerName = null;
    private BarcodeListener barcodeListener;
    private ScannerConnectionListener connectionListener;
    private List<DCSScannerInfo> availableScanners = new ArrayList<>();
    private Handler mainHandler = new Handler(Looper.getMainLooper());
    
    public interface BarcodeListener {
        void onBarcodeReceived(String barcodeData, int barcodeType, int scannerId);
    }
    
    public interface ScannerConnectionListener {
        void onScannerConnected(String scannerName, int scannerId);
        void onScannerDisconnected(int scannerId);
        void onScannerAppeared(String scannerName, int scannerId);
        void onScannerDisappeared(int scannerId);
    }
    
    public ScannerSDKHelper(Context context) {
        this.context = context;
    }
    
    /**
     * Check if Scanner SDK is available
     */
    public static boolean isSdkAvailable() {
        try {
            Class.forName("com.zebra.scannercontrol.SDKHandler");
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }
    
    /**
     * Initialize the Scanner SDK
     */
    public synchronized boolean initialize() {
        if (isInitialized) {
            return true;
        }
        
        try {
            sdkHandler = new SDKHandler(context, true, false);
            sdkHandler.dcssdkSetDelegate(this);
            
            // Subscribe to events
            int notificationsMask = 0;
            notificationsMask |= DCSSDKDefs.DCSSDK_EVENT.DCSSDK_EVENT_SCANNER_APPEARANCE.value;
            notificationsMask |= DCSSDKDefs.DCSSDK_EVENT.DCSSDK_EVENT_SCANNER_DISAPPEARANCE.value;
            notificationsMask |= DCSSDKDefs.DCSSDK_EVENT.DCSSDK_EVENT_SESSION_ESTABLISHMENT.value;
            notificationsMask |= DCSSDKDefs.DCSSDK_EVENT.DCSSDK_EVENT_SESSION_TERMINATION.value;
            notificationsMask |= DCSSDKDefs.DCSSDK_EVENT.DCSSDK_EVENT_BARCODE.value;
            
            sdkHandler.dcssdkSubsribeForEvents(notificationsMask);
            
            isInitialized = true;
            Log.d(TAG, "Zebra Scanner SDK initialized successfully");
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Scanner SDK: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Set barcode listener
     */
    public void setBarcodeListener(BarcodeListener listener) {
        this.barcodeListener = listener;
    }
    
    /**
     * Set connection listener
     */
    public void setConnectionListener(ScannerConnectionListener listener) {
        this.connectionListener = listener;
    }
    
    /**
     * Get available scanners
     */
    public List<DCSScannerInfo> getAvailableScanners() {
        if (sdkHandler != null) {
            try {
                List<DCSScannerInfo> scanners = new ArrayList<>();
                sdkHandler.dcssdkGetAvailableScannersList(scanners);
                this.availableScanners = scanners;
                return scanners;
            } catch (Exception e) {
                Log.e(TAG, "Error getting scanners list: " + e.getMessage());
            }
        }
        return new ArrayList<>();
    }
    
    /**
     * Connect to a scanner
     */
    public boolean connect(int scannerId) {
        if (sdkHandler == null) {
            Log.e(TAG, "SDK not initialized");
            return false;
        }
        
        try {
            DCSSDKDefs.DCSSDK_RESULT result = sdkHandler.dcssdkEstablishCommunicationSession(scannerId);
            if (result == DCSSDKDefs.DCSSDK_RESULT.DCSSDK_RESULT_SUCCESS) {
                Log.d(TAG, "Connecting to scanner ID: " + scannerId);
                return true;
            } else {
                Log.e(TAG, "Failed to connect to scanner: " + result);
                return false;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error connecting to scanner: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Disconnect from current scanner
     */
    public boolean disconnect() {
        if (sdkHandler == null || connectedScannerId == -1) {
            return false;
        }
        
        try {
            DCSSDKDefs.DCSSDK_RESULT result = sdkHandler.dcssdkTerminateCommunicationSession(connectedScannerId);
            connectedScannerId = -1;
            connectedScannerName = null;
            Log.d(TAG, "Disconnected from scanner");
            return result == DCSSDKDefs.DCSSDK_RESULT.DCSSDK_RESULT_SUCCESS;
        } catch (Exception e) {
            Log.e(TAG, "Error disconnecting: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if a scanner is connected
     */
    public boolean isConnected() {
        return connectedScannerId != -1;
    }
    
    /**
     * Get connected scanner name
     */
    public String getConnectedScannerName() {
        return connectedScannerName;
    }
    
    /**
     * Get connected scanner ID
     */
    public int getConnectedScannerId() {
        return connectedScannerId;
    }
    
    /**
     * Enable auto-reconnect
     */
    public void setAutoReconnect(boolean enable) {
        if (sdkHandler != null && connectedScannerId != -1) {
            sdkHandler.dcssdkEnableAutomaticSessionReestablishment(enable, connectedScannerId);
        }
    }
    
    /**
     * Cleanup resources
     */
    public void destroy() {
        if (sdkHandler != null) {
            try {
                if (connectedScannerId != -1) {
                    sdkHandler.dcssdkTerminateCommunicationSession(connectedScannerId);
                }
            } catch (Exception e) {
                // Ignore
            }
        }
        isInitialized = false;
        connectedScannerId = -1;
        connectedScannerName = null;
    }
    
    // ============================================
    // IDcsSdkApiDelegate callbacks
    // ============================================
    
    @Override
    public void dcssdkEventScannerAppeared(DCSScannerInfo scannerInfo) {
        Log.d(TAG, "Scanner appeared: " + scannerInfo.getScannerName());
        
        if (connectionListener != null) {
            final String name = scannerInfo.getScannerName();
            final int id = scannerInfo.getScannerID();
            mainHandler.post(() -> connectionListener.onScannerAppeared(name, id));
        }
    }
    
    @Override
    public void dcssdkEventScannerDisappeared(int scannerId) {
        Log.d(TAG, "Scanner disappeared: " + scannerId);
        
        if (connectionListener != null) {
            mainHandler.post(() -> connectionListener.onScannerDisappeared(scannerId));
        }
    }
    
    @Override
    public void dcssdkEventCommunicationSessionEstablished(DCSScannerInfo scannerInfo) {
        Log.d(TAG, "Scanner connected: " + scannerInfo.getScannerName());
        connectedScannerId = scannerInfo.getScannerID();
        connectedScannerName = scannerInfo.getScannerName();
        
        if (connectionListener != null) {
            final String name = scannerInfo.getScannerName();
            final int id = scannerInfo.getScannerID();
            mainHandler.post(() -> connectionListener.onScannerConnected(name, id));
        }
    }
    
    @Override
    public void dcssdkEventCommunicationSessionTerminated(int scannerId) {
        Log.d(TAG, "Scanner disconnected: " + scannerId);
        
        if (scannerId == connectedScannerId) {
            connectedScannerId = -1;
            connectedScannerName = null;
        }
        
        if (connectionListener != null) {
            mainHandler.post(() -> connectionListener.onScannerDisconnected(scannerId));
        }
    }
    
    @Override
    public void dcssdkEventBarcode(byte[] barcodeData, int barcodeType, int scannerId) {
        if (barcodeData == null || barcodeData.length == 0) return;
        
        String barcodeStr = new String(barcodeData);
        Log.d(TAG, "Barcode received: " + barcodeStr + " (type: " + barcodeType + ", scanner: " + scannerId + ")");
        
        if (barcodeListener != null && !barcodeStr.isEmpty()) {
            mainHandler.post(() -> barcodeListener.onBarcodeReceived(barcodeStr, barcodeType, scannerId));
        }
    }
    
    @Override
    public void dcssdkEventImage(byte[] imageData, int scannerId) {
        // Image event - not used for basic barcode scanning
        Log.d(TAG, "Image event from scanner: " + scannerId);
    }
    
    @Override
    public void dcssdkEventVideo(byte[] videoFrame, int scannerId) {
        // Video event - not used for basic barcode scanning
        Log.d(TAG, "Video event from scanner: " + scannerId);
    }
    
    @Override
    public void dcssdkEventBinaryData(byte[] binaryData, int scannerId) {
        // Binary data event - not used for basic barcode scanning
        Log.d(TAG, "Binary data event from scanner: " + scannerId);
    }
    
    @Override
    public void dcssdkEventFirmwareUpdate(com.zebra.scannercontrol.FirmwareUpdateEvent event) {
        // Firmware update event
        Log.d(TAG, "Firmware update event");
    }
    
    @Override
    public void dcssdkEventAuxScannerAppeared(DCSScannerInfo newTopology, DCSScannerInfo auxScanner) {
        // Auxiliary scanner appeared
        Log.d(TAG, "Aux scanner appeared: " + auxScanner.getScannerName());
    }
    
    @Override
    public void dcssdkEventConfigurationUpdate(com.zebra.barcode.sdk.sms.ConfigurationUpdateEvent event) {
        // Configuration update event
        Log.d(TAG, "Configuration update event");
    }
}
