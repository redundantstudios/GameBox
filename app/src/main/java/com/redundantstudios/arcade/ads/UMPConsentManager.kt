package com.redundantstudios.arcade.ads

import android.app.Activity
import android.util.Log
import com.google.android.ump.UserMessagingPlatform
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentDebugSettings
import com.redundantstudios.arcade.BuildConfig

class UMPConsentManager(private val activity: Activity) {
    private val TAG = "UMPConsentManager"
    private var consentInformation: ConsentInformation? = null

    fun gatherConsent(onConsentGathered: () -> Unit) {
        val debugSettings = if (BuildConfig.DEBUG) {
            // debug-only: forces EEA geography to test the consent form; never active in release.
            ConsentDebugSettings.Builder(activity)
                .addTestDeviceHashedId("D1C68FF1E30260C7541245280C398914")
                .setDebugGeography(ConsentDebugSettings.DebugGeography.DEBUG_GEOGRAPHY_EEA)
                .build()
        } else {
            null
        }

        val params = ConsentRequestParameters.Builder().apply {
            debugSettings?.let { setConsentDebugSettings(it) }
        }.build()

        consentInformation = UserMessagingPlatform.getConsentInformation(activity)

        consentInformation?.requestConsentInfoUpdate(
            activity,
            params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { formError ->
                    if (formError != null) {
                        Log.e(TAG, "Consent form error: ${formError.message}")
                    }
                    onConsentGathered()
                }
            },
            { error ->
                Log.e(TAG, "Consent info update error: ${error.message}")
                onConsentGathered()
            }
        )
    }

    fun canRequestAds(): Boolean {
        return consentInformation?.getConsentStatus() == ConsentInformation.ConsentStatus.REQUIRED
    }
}
