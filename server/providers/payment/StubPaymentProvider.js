// ─────────────────────────────────────────────────────────────────────────────
// Stub-PaymentProvider (Mock) — protokolliert Abrechnungsvorgänge, ohne
// echtes Geld zu bewegen. Beträge via ENV konfigurierbar (siehe index.js).
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const cents = (env, fallback) => parseInt(process.env[env] || String(fallback), 10);

class StubPaymentProvider {
  async createSubscription(tenant, plan = 'standard') {
    const amountCents = cents('BILLING_SUBSCRIPTION_CENTS', 49900);
    console.log(`💳 [Billing-Stub] Abo "${plan}" für Tenant ${tenant.slug}: ${(amountCents / 100).toFixed(2)} €/Monat`);
    return { providerRef: `stub-sub-${crypto.randomUUID()}`, status: 'paid', amountCents };
  }

  async chargeDealSetup(tenant, project) {
    const amountCents = cents('BILLING_DEAL_SETUP_CENTS', 99000);
    console.log(`💳 [Billing-Stub] Deal-Setup-Gebühr für "${project.codename}" (Tenant ${tenant.slug}): ${(amountCents / 100).toFixed(2)} €`);
    return { providerRef: `stub-deal-${crypto.randomUUID()}`, status: 'paid', amountCents };
  }

  async chargeDataroomTier(tenant, project, usage = {}) {
    const amountCents = cents('BILLING_DATAROOM_CENTS', 19900);
    console.log(`💳 [Billing-Stub] Datenraum-Staffel für "${project.codename}" (Tenant ${tenant.slug}): ${(amountCents / 100).toFixed(2)} €`);
    return { providerRef: `stub-dr-${crypto.randomUUID()}`, status: 'paid', amountCents };
  }

  async status() { return 'paid'; }
}

module.exports = StubPaymentProvider;
