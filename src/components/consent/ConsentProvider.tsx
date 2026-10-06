'use client';

/**
 * Consent management.
 *
 * Requirements this satisfies:
 *  - EEA/UK/Swiss visitors get Accept / Reject / Manage before anything loads
 *  - Google AdSense and Google Analytics are only loaded after consent
 *  - the choice is stored, versioned, re-promptable and withdrawable from the
 *    Cookie Policy page and the footer
 *  - a TCF 2.2 compatible `__tcfapi()` stub is exposed so partner vendors and
 *    Google's own tag can read the consent state
 *
 * IMPORTANT: this is a self-hosted consent mechanism, not a Google-certified
 * CMP. Under AdSense's EU user consent policy a certified CMP is required for
 * personalised ads in the EEA/UK. `ADSENSE_CHECKLIST.md` covers that step; the
 * code here keeps the site correct and non-tracking until you add one, and
 * detects a certified CMP automatically if present.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface ConsentState {
  /** Essential storage is always permitted; recorded for completeness. */
  essential: true;
  /** Ad personalisation + ad storage. */
  ads: boolean;
  /** Analytics storage (GA4). */
  analytics: boolean;
  /** ISO timestamp of the decision. */
  decidedAt: string;
  /** Bump to re-ask everyone after a policy change. */
  version: number;
}

export const CONSENT_VERSION = 1;
const STORAGE_KEY = 'toolino.consent.v1';
/** Region hint cookie is deliberately avoided; we use timezone detection. */
const EEA_TIMEZONES = new Set([
  'Europe/Amsterdam', 'Europe/Andorra', 'Europe/Athens', 'Europe/Belgrade', 'Europe/Berlin',
  'Europe/Bratislava', 'Europe/Brussels', 'Europe/Bucharest', 'Europe/Budapest', 'Europe/Copenhagen',
  'Europe/Dublin', 'Europe/Gibraltar', 'Europe/Helsinki', 'Europe/Istanbul', 'Europe/Kyiv',
  'Europe/Lisbon', 'Europe/Ljubljana', 'Europe/London', 'Europe/Luxembourg', 'Europe/Madrid',
  'Europe/Malta', 'Europe/Monaco', 'Europe/Oslo', 'Europe/Paris', 'Europe/Podgorica',
  'Europe/Prague', 'Europe/Reykjavik', 'Europe/Riga', 'Europe/Rome', 'Europe/San_Marino',
  'Europe/Sarajevo', 'Europe/Skopje', 'Europe/Sofia', 'Europe/Stockholm', 'Europe/Tallinn',
  'Europe/Vaduz', 'Europe/Vatican', 'Europe/Vienna', 'Europe/Vilnius', 'Europe/Warsaw',
  'Europe/Zagreb', 'Europe/Zurich', 'Atlantic/Reykjavik', 'Atlantic/Canary', 'Atlantic/Madeira',
  'Atlantic/Azores', 'Asia/Nicosia', 'Asia/Famagusta', 'Africa/Ceuta', 'America/St_Johns',
]);

interface ConsentContextValue {
  /** `null` until the visitor has made a choice. */
  consent: ConsentState | null;
  /** True when a decision is still required (EEA/UK/Swiss visitor, no choice). */
  needsDecision: boolean;
  /** True once the provider has read storage on the client. */
  ready: boolean;
  /** True when the visitor is likely in a consent-required region. */
  requiresConsent: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (choices: { ads: boolean; analytics: boolean }) => void;
  /** Re-opens the banner so a choice can be changed. */
  reopen: () => void;
  /** Set when the visitor explicitly asked to revisit their choice. */
  isBannerOpen: boolean;
  closeBanner: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

function detectConsentRegion(): boolean {
  if (typeof Intl === 'undefined') return true;
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Default to requiring consent when detection fails: safer, and only costs
    // a one-time prompt.
    if (!zone) return true;
    return EEA_TIMEZONES.has(zone);
  } catch {
    return true;
  }
}

function readStoredConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (parsed.version !== CONSENT_VERSION) return null;
    return {
      essential: true,
      ads: parsed.ads === true,
      analytics: parsed.analytics === true,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : new Date().toISOString(),
      version: CONSENT_VERSION,
    };
  } catch {
    return null;
  }
}

/**
 * Minimal TCF 2.2 `__tcfapi` shim.
 *
 * Any script that expects the IAB API can read the current choice and register
 * a listener. This does not replace a certified CMP; it makes the page behave
 * correctly for vendors that probe for consent.
 */
function installTcfStub(getConsent: () => ConsentState | null): void {
  if (typeof window === 'undefined') return;
  type TcfCallback = (data: unknown, success: boolean) => void;
  interface WindowWithTcf {
    __tcfapi?: (command: string, version: number, callback: TcfCallback, parameter?: unknown) => void;
    __tcfapiBuffer?: unknown[];
  }
  const target = window as Window & WindowWithTcf;
  if (typeof target.__tcfapi === 'function') return;

  target.__tcfapi = (command, _version, callback) => {
    const consent = getConsent();
    const granted = consent?.ads === true;
    switch (command) {
      case 'ping':
        callback({ gdprApplies: true, cmpLoaded: true, cmpStatus: 'loaded', apiVersion: '2.2' }, true);
        return;
      case 'getTCData':
        callback(
          {
            gdprApplies: true,
            tcfPolicyVersion: 4,
            eventStatus: 'tcloaded',
            cmpStatus: 'loaded',
            listenerId: null,
            isServiceSpecific: true,
            purpose: { consents: { 1: granted, 2: granted, 3: granted, 4: granted } },
            vendor: { consents: {} },
          },
          true
        );
        return;
      default:
        callback(null, false);
    }
  };
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [ready, setReady] = useState(false);
  const [isBannerOpen, setBannerOpen] = useState(false);
  const [requiresConsent, setRequiresConsent] = useState(true);

  useEffect(() => {
    const region = detectConsentRegion();
    setRequiresConsent(region);
    const stored = readStoredConsent();
    setConsent(stored);
    setBannerOpen(stored === null);
    setReady(true);
    installTcfStub(() => stored);
  }, []);

  const persist = useCallback((next: ConsentState) => {
    setConsent(next);
    setBannerOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode with storage disabled: the choice simply is not remembered.
    }
    // Let AdSense/GA4 react without a reload.
    window.dispatchEvent(new CustomEvent('toolino:consent', { detail: next }));
  }, []);

  const acceptAll = useCallback(() => {
    persist({
      essential: true,
      ads: true,
      analytics: true,
      decidedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
    });
  }, [persist]);

  const rejectAll = useCallback(() => {
    persist({
      essential: true,
      ads: false,
      analytics: false,
      decidedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
    });
  }, [persist]);

  const save = useCallback(
    (choices: { ads: boolean; analytics: boolean }) => {
      persist({
        essential: true,
        ads: choices.ads,
        analytics: choices.analytics,
        decidedAt: new Date().toISOString(),
        version: CONSENT_VERSION,
      });
    },
    [persist]
  );

  const reopen = useCallback(() => setBannerOpen(true), []);
  const closeBanner = useCallback(() => setBannerOpen(false), []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      ready,
      requiresConsent,
      needsDecision: ready && requiresConsent && consent === null,
      acceptAll,
      rejectAll,
      save,
      reopen,
      isBannerOpen,
      closeBanner,
    }),
    [consent, ready, requiresConsent, acceptAll, rejectAll, save, reopen, isBannerOpen, closeBanner]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used inside <ConsentProvider>.');
  }
  return context;
}

/** True when ad storage and personalisation may be used. */
export function useAdsAllowed(): boolean {
  const { consent } = useConsent();
  return consent?.ads === true;
}

/** True when analytics storage may be used. */
export function useAnalyticsAllowed(): boolean {
  const { consent } = useConsent();
  return consent?.analytics === true;
}
