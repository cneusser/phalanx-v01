// ─────────────────────────────────────────────────────────────────────────────
// Sprint 5: Austauschbares PaymentProvider-Interface (hinter Feature-Flag)
//
// interface PaymentProvider {
//   /** Tenant-Abo anlegen/verlängern. @returns {Promise<{providerRef, status}>} */
//   createSubscription(tenant, plan)
//   /** Setup-Gebühr je aktiviertem Deal-Prozess. @returns {Promise<{providerRef, status, amountCents}>} */
//   chargeDealSetup(tenant, project)
//   /** Optionale Datenraum-Staffel (pro Datenraum/Speicher). */
//   chargeDataroomTier(tenant, project, usage)
//   /** Zahlungsstatus abfragen. @returns {Promise<'pending'|'paid'|'failed'>} */
//   status(providerRef)
// }
//
// Feature-Flag: Abrechnung läuft NUR, wenn beides aktiv ist:
//   ENV BILLING_ENABLED=1  UND  tenants.billing_enabled = 1
//
// Preise (Cent) via ENV konfigurierbar:
//   BILLING_SUBSCRIPTION_CENTS (Default 49900 / Monat)
//   BILLING_DEAL_SETUP_CENTS   (Default 99000 je aktiviertem Deal)
//   BILLING_DATAROOM_CENTS     (Default 19900 je Datenraum-Staffel)
//
// ── Echten Dienst anbinden (z. B. Stripe, Mollie) ────────────────────────────
// 1. providers/payment/<Anbieter>Provider.js mit den vier Methoden anlegen
//    (Stripe: subscriptions.create / invoiceItems.create / invoices.retrieve).
// 2. Unten in PROVIDERS registrieren.
// 3. ENV: PAYMENT_PROVIDER=<anbieter>, <ANBIETER>_API_KEY=…, BILLING_ENABLED=1.
// Kein weiterer Codeeingriff: der Billing-Flow spricht nur das Interface.
// ─────────────────────────────────────────────────────────────────────────────

const StubPaymentProvider = require('./StubPaymentProvider');

const PROVIDERS = {
  stub: StubPaymentProvider,
  // stripe: require('./StripeProvider'),
};

function getPaymentProvider() {
  const key = (process.env.PAYMENT_PROVIDER || 'stub').toLowerCase();
  const Provider = PROVIDERS[key];
  if (!Provider) throw new Error(`Unbekannter PAYMENT_PROVIDER "${key}", verfügbar: ${Object.keys(PROVIDERS).join(', ')}`);
  return new Provider();
}

function billingGloballyEnabled() {
  return process.env.BILLING_ENABLED === '1';
}

module.exports = { getPaymentProvider, billingGloballyEnabled };
