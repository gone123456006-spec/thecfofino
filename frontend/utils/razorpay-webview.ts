/**
 * Razorpay Checkout in WebView (production-safe HTML escaping + fast open).
 *
 * **Google Play (payments):** Company registration / professional services — not digital goods.
 */

export interface RazorpayOptions {
  orderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
  name: string;
  description: string;
  logoUrl?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillContact?: string;
  themeColor?: string;
}

export interface RazorpaySuccessPayload {
  success: true;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailurePayload {
  success: false;
  error: string;
}

export type RazorpayPayload = RazorpaySuccessPayload | RazorpayFailurePayload;

/** No-op for WebView inject (avoid heavy DOM polling). */
export const RAZORPAY_HIDE_TEST_MODE_SCRIPT = 'true;';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsString(s: string): string {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Self-contained HTML: loads checkout.js, opens Razorpay ASAP, posts JSON to ReactNativeWebView.
 */
export function buildRazorpayHtml(opts: RazorpayOptions): string {
  const {
    orderId,
    amount,
    currency,
    keyId,
    name,
    description,
    logoUrl = '',
    prefillName = '',
    prefillEmail = '',
    prefillContact = '',
    themeColor = '#3395ff',
  } = opts;

  const jsName = escapeJsString(name);
  const jsDesc = escapeJsString(description);
  const jsPrefillName = escapeJsString(prefillName);
  const jsPrefillEmail = escapeJsString(prefillEmail);
  const jsPrefillContact = escapeJsString(prefillContact);
  const jsLogo = logoUrl.trim() ? escapeJsString(logoUrl.trim()) : '';
  const imageOption = jsLogo ? `      image: '${jsLogo}',\n` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
  <title>Secure checkout</title>
  <link rel="preconnect" href="https://checkout.razorpay.com"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      background: #f0f7ff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      max-width: 280px;
      width: 100%;
      text-align: center;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .loader {
      width: 40px;
      height: 40px;
      border: 3px solid #e3eef8;
      border-top-color: ${themeColor};
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin: 12px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 15px; font-weight: 600; color: #1a1a2e; }
    .sub { font-size: 12px; color: #64748b; margin-top: 6px; }
    [class*="testmode"], [class*="test-mode"], .testmode-sidebar { display: none !important; }
  </style>
</head>
<body>
  <div class="card" id="loader">
    <div class="loader"></div>
    <h1>Opening checkout…</h1>
    <p class="sub">Secure payment via Razorpay</p>
  </div>
  <script>
    window.hideTestMode = function() {
      try {
        document.querySelectorAll('[class*="testmode"],[class*="test-mode"],.testmode-sidebar').forEach(function(el) {
          el.style.setProperty('display', 'none', 'important');
        });
      } catch (e) {}
    };
    function postMsg(data) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify(data)); } catch (e) {}
    }
    var options = {
      key: '${escapeJsString(keyId)}',
      amount: ${Number(amount)},
      currency: '${escapeJsString(currency)}',
      name: '${jsName}',
      description: '${jsDesc}',
${imageOption}      order_id: '${escapeJsString(orderId)}',
      prefill: {
        name: '${jsPrefillName}',
        email: '${jsPrefillEmail}',
        contact: '${jsPrefillContact}'
      },
      theme: { color: '${escapeJsString(themeColor)}' },
      config: {
        display: {
          hide: [
            { method: 'card' },
            { method: 'emi' },
            { method: 'paylater' },
            { method: 'netbanking' }
          ],
          preferences: { show_default_blocks: true }
        }
      },
      modal: {
        backdropclose: false,
        ondismiss: function() {
          postMsg({ success: false, error: 'Payment cancelled by user' });
        }
      },
      handler: function(response) {
        postMsg({
          success: true,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature
        });
      }
    };
    var checkoutOpened = false;
    function initRzpCheckout() {
      if (checkoutOpened) return;
      if (typeof Razorpay === 'undefined') {
        postMsg({ success: false, error: 'Could not load Razorpay checkout. Check your internet connection.' });
        return;
      }
      checkoutOpened = true;
      var loader = document.getElementById('loader');
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function(response) {
        var err = (response.error && response.error.description) ? response.error.description : 'Payment failed';
        postMsg({ success: false, error: err });
      });
      rzp.on('ready', function() {
        if (loader) loader.style.display = 'none';
        if (window.hideTestMode) window.hideTestMode();
      });
      rzp.open();
    }
    if (typeof Razorpay !== 'undefined') initRzpCheckout();
  </script>
  <script src="https://checkout.razorpay.com/v1/checkout.js" onload="initRzpCheckout()"></script>
</body>
</html>`;
}
