/**
 * Razorpay WebView helper
 * Generates a self-contained HTML page that opens Razorpay checkout automatically
 * and posts the result back via window.ReactNativeWebView.postMessage.
 */

export interface RazorpayOptions {
    orderId: string;
    amount: number;      // in paise
    currency: string;
    keyId: string;
    name: string;        // business / merchant name shown in modal
    description: string;
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

/**
 * Returns an HTML string that:
 * 1. Loads Razorpay checkout.js from CDN
 * 2. Auto-opens the payment modal
 * 3. Posts a JSON message to React Native via ReactNativeWebView.postMessage
 */
export function buildRazorpayHtml(opts: RazorpayOptions): string {
    const {
        orderId,
        amount,
        currency,
        keyId,
        name,
        description,
        prefillName = '',
        prefillEmail = '',
        prefillContact = '',
        themeColor = '#6366f1',
    } = opts;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f7ff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #374151;
    }
    .loader {
      border: 3px solid #e5e7eb;
      border-top: 3px solid ${themeColor};
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="loader"></div>
  <p>Opening payment…</p>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function postMsg(data) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify(data)); } catch(e) {}
    }

    var options = {
      key:         "${keyId}",
      amount:      "${amount}",
      currency:    "${currency}",
      name:        "${name.replace(/"/g, '\\"')}",
      description: "${description.replace(/"/g, '\\"')}",
      order_id:    "${orderId}",
      prefill: {
        name:    "${prefillName.replace(/"/g, '\\"')}",
        email:   "${prefillEmail.replace(/"/g, '\\"')}",
        contact: "${prefillContact.replace(/"/g, '\\"')}"
      },
      theme: { color: "${themeColor}" },
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
          razorpay_order_id:   response.razorpay_order_id,
          razorpay_signature:  response.razorpay_signature
        });
      }
    };

    window.onload = function() {
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function(response) {
        postMsg({ success: false, error: response.error.description || 'Payment failed' });
      });
      rzp.open();
    };
  </script>
</body>
</html>
`;
}
