package com.zebra.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.zebra.app.plugins.ZebraPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the Zebra plugin
        registerPlugin(ZebraPlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}
