"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getLicenseKey,
  saveLicenseKey,
  removeLicenseKey,
  validateLicense,
  isLicensed as checkLicensed,
  type LicenseValidation,
} from "@/lib/license";

export interface UseLicenseReturn {
  licensed: boolean;
  licenseKey: string | null;
  loading: boolean;
  error: string | null;
  validation: LicenseValidation | null;
  activate: (key: string) => Promise<void>;
  deactivate: () => Promise<void>;
}

export function useLicense(): UseLicenseReturn {
  const [licensed, setLicensed] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<LicenseValidation | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const key = await getLicenseKey();
        setLicenseKey(key);
        const valid = await checkLicensed();
        setLicensed(valid);
      } catch {
        // IndexedDB may not be available (SSR, private browsing)
        setLicensed(false);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const activate = useCallback(async (key: string) => {
    setError(null);
    setLoading(true);
    try {
      const result = await validateLicense(key);
      setValidation(result);
      if (result.valid) {
        await saveLicenseKey(key);
        setLicenseKey(key);
        setLicensed(true);
      } else {
        setError(
          result.status === "cancelled"
            ? "This license has been cancelled."
            : "Invalid or expired license key.",
        );
      }
    } catch {
      setError("Failed to validate license. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  const deactivate = useCallback(async () => {
    await removeLicenseKey();
    setLicenseKey(null);
    setLicensed(false);
    setValidation(null);
    setError(null);
  }, []);

  return { licensed, licenseKey, loading, error, validation, activate, deactivate };
}
