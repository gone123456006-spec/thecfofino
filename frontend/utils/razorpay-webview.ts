/**
 * Razorpay Checkout in WebView (production-safe HTML escaping + Razorpay-branded loader).
 */

export interface RazorpayOptions {
  orderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
  name: string;
  description: string;
  /** Full URL to merchant logo (HTTPS recommended). Razorpay checkout `image` option. */
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
 * Self-contained HTML: loads checkout.js, opens Razorpay, posts JSON to ReactNativeWebView.
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

  const safeName = escapeHtml(name);
  const safeDesc = escapeHtml(description);
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
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      min-height: 100vh;
      background: linear-gradient(165deg, #f0f7ff 0%, #e8f4fc 45%, #ffffff 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #1a1a2e;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 28px 24px;
      max-width: 320px;
      width: 100%;
      box-shadow: 0 4px 24px rgba(51, 149, 255, 0.12), 0 1px 3px rgba(0,0,0,0.06);
      text-align: center;
    }
    .brand-logo {
      width: 120px;
      height: auto;
      max-height: 48px;
      object-fit: contain;
      margin: 0 auto 14px;
      display: block;
    }
    .rzp-mark {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: ${themeColor};
      margin-bottom: 16px;
    }
    .loader {
      width: 44px;
      height: 44px;
      border: 3px solid #e3eef8;
      border-top-color: ${themeColor};
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 16px; font-weight: 600; color: #1a1a2e; margin-bottom: 8px; }
    .sub { font-size: 13px; color: #64748b; line-height: 1.45; }
    .footer { margin-top: 20px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    ${jsLogo ? `<img class="brand-logo" src="${escapeHtml(logoUrl.trim())}" alt="${safeName}" />` : ''}
    <div class="rzp-mark">RAZORPAY</div>
    <div class="loader"></div>
    <h1>${safeName}</h1>
    <p class="sub">${safeDesc}</p>
    <p class="footer">256-bit encryption · PCI DSS compliant</p>
  </div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
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
    window.onload = function() {
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function(response) {
        var err = (response.error && response.error.description) ? response.error.description : 'Payment failed';
        postMsg({ success: false, error: err });
      });
      rzp.open();
    };
  </script>
</body>
</html>`;
}
