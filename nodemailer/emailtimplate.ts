export const WELCOME_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Sellora!</title>
  <style>
    body {
      font-family: 'Inter', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #222;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #ccebff, #a8daff);
      color: #222;
      text-align: center;
      padding: 35px 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 600;
    }
    .body {
      padding: 35px 30px;
    }
    .body p {
      font-size: 16px;
      margin: 16px 0;
      line-height: 1.8;
      color: #444;
    }
    .cta-button {
      display: inline-block;
      background: #222;
      color: #ffffff !important;
      padding: 14px 32px;
      border-radius: 25px;
      text-decoration: none;
      font-weight: 600;
      margin: 25px 0;
      transition: all 0.3s ease;
    }
    .cta-button:hover {
      background: #000;
    }
    .features {
      margin: 25px 0;
      padding: 25px;
      background: #f9f9f9;
      border-radius: 10px;
      border-left: 4px solid #222;
    }
    .feature-item {
      display: flex;
      align-items: center;
      margin: 12px 0;
    }
    .feature-icon {
      margin-right: 10px;
      font-size: 18px;
    }
    .footer {
      text-align: center;
      padding: 25px;
      background-color: #f5f5f5;
      color: #666;
      font-size: 14px;
    }
    .highlight {
      color: #222;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Welcome to Sellora ✨</h1>
    </div>
    <div class="body">
      <p>Hello {userName},</p>
      <p>We're thrilled to have you join <span class="highlight">Sellora</span> — your modern e-commerce platform for seamless selling and shopping.</p>

      <div class="features">
        <div class="feature-item">
          <span class="feature-icon">🛍️</span>
          <span>Browse unique products from sellers worldwide</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">💳</span>
          <span>Secure checkout with multiple payment options</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📦</span>
          <span>Track your orders in real-time</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">⭐</span>
          <span>Get personalized recommendations</span>
        </div>
      </div>
      
      <p>Start exploring now:</p>
      <center>
        <a href="{dashboardLink}" class="cta-button">Start Shopping</a>
      </center>
      
      <p>Need assistance? Our <a href="{helpCenterLink}" style="color: #222;">Help Center</a> is here for you.</p>
     
      <p>Happy shopping! 🛒<br>
      <span class="highlight">– The Sellora Team</span></p>
    </div>
    <div class="footer">
      <p>© 2025 Sellora. All rights reserved.</p>
      <p>This email was sent to {userEmail}. <a href="{unsubscribeLink}" style="color: #666;">Manage preferences</a></p>
    </div>
  </div>
</body>
</html>
`;

export const NEWSLETTER_SUBSCRIPTION_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Sellora Newsletter!</title>
  <style>
    body {
      font-family: 'Inter', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #222;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #ccebff, #a8daff);
      color: #222;
      text-align: center;
      padding: 40px 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 600;
    }
    .header .emoji {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .body {
      padding: 35px 30px;
    }
    .body p {
      font-size: 16px;
      margin: 16px 0;
      line-height: 1.8;
      color: #444;
    }
    .benefits {
      margin: 25px 0;
      padding: 25px;
      background: #ccebff;
      border-radius: 10px;
    }
    .benefit-item {
      display: flex;
      align-items: flex-start;
      margin: 15px 0;
    }
    .benefit-icon {
      margin-right: 12px;
      font-size: 20px;
      flex-shrink: 0;
    }
    .benefit-text {
      font-size: 15px;
      color: #222;
    }
    .cta-button {
      display: inline-block;
      background: #222;
      color: #ffffff !important;
      padding: 14px 32px;
      border-radius: 25px;
      text-decoration: none;
      font-weight: 600;
      margin: 25px 0;
      transition: all 0.3s ease;
    }
    .cta-button:hover {
      background: #000;
    }
    .footer {
      text-align: center;
      padding: 25px;
      background-color: #f5f5f5;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #e5e5e5;
    }
    .footer a {
      color: #666;
      text-decoration: underline;
    }
    .highlight {
      color: #222;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="emoji">🎉</div>
      <h1>You're In!</h1>
    </div>
    <div class="body">
      <p>Thank you for subscribing to the <span class="highlight">Sellora Newsletter</span>!</p>
      
      <p>Get ready to receive exclusive content straight to your inbox:</p>

      <div class="benefits">
        <div class="benefit-item">
          <span class="benefit-icon">💎</span>
          <span class="benefit-text"><strong>Exclusive Offers</strong> – Be the first to know about special deals and discounts</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">🎁</span>
          <span class="benefit-text"><strong>Unique Gift Ideas</strong> – Discover curated gift collections for every occasion</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">✨</span>
          <span class="benefit-text"><strong>New Arrivals</strong> – Get early access to the latest products</span>
        </div>
        <div class="benefit-item">
          <span class="benefit-icon">💡</span>
          <span class="benefit-text"><strong>Shopping Tips</strong> – Personalized recommendations just for you</span>
        </div>
      </div>
      
      <p>Start shopping and enjoying your benefits now:</p>
      <center>
        <a href="${process.env.NEXTAUTH_URL || 'https://sellora.com'}" class="cta-button">Explore Sellora</a>
      </center>
      
      <p>We're excited to have you as part of our community!</p>
     
      <p>Happy shopping! 🛍️<br>
      <span class="highlight">– The Sellora Team</span></p>
    </div>
    <div class="footer">
      <p>© 2025 Sellora. All rights reserved.</p>
      <p>This email was sent to {userEmail}.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/unsubscribe">Unsubscribe</a> | <a href="${process.env.NEXTAUTH_URL}/preferences">Manage preferences</a></p>
    </div>
  </div>
</body>
</html>
`;

export const INVITATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .button {
      display: inline-block;
      background: #222;
      color: white !important;
      padding: 12px 24px;
      border-radius: 25px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #000;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <h2>Workspace Invitation</h2>
    <p>You've been invited to join the workspace <strong>{workspaceName}</strong>.</p>
    <p>Click the button below to accept the invitation:</p>
    <a href="{inviteLink}" class="button">Accept Invitation</a>
    <p style="color: #666; font-size: 14px;">This link expires in 72 hours.</p>
  </div>
</body>
</html>
`;

// lib/emailtimplate.ts - ADD THIS TO YOUR EXISTING FILE

export const ORDER_CONFIRMATION_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
  </style>
  <![endif]-->
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #222;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-align: center;
      padding: 40px 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header .emoji {
      font-size: 56px;
      margin-bottom: 15px;
      animation: bounce 2s infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .header p {
      margin: 10px 0 0;
      font-size: 16px;
      opacity: 0.95;
    }
    .body {
      padding: 40px 30px;
    }
    .body p {
      font-size: 16px;
      margin: 16px 0;
      line-height: 1.8;
      color: #444;
    }
    .greeting {
      font-size: 18px;
      color: #222;
      margin-bottom: 10px;
    }
    .order-info {
      background: linear-gradient(135deg, #f6f8fc 0%, #eef2f7 100%);
      border-radius: 12px;
      padding: 24px;
      margin: 30px 0;
      border: 1px solid #e1e8ed;
    }
    .order-info-grid {
      display: table;
      width: 100%;
      border-spacing: 0;
    }
    .order-info-cell {
      display: table-cell;
      width: 50%;
      padding: 12px;
      vertical-align: top;
    }
    .order-info .label {
      color: #6b7280;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      margin-bottom: 6px;
      display: block;
    }
    .order-info .value {
      color: #111827;
      font-size: 18px;
      font-weight: 700;
    }
    .section-title {
      color: #111827;
      font-size: 22px;
      font-weight: 700;
      margin: 40px 0 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .items-table tr {
      border-bottom: 1px solid #e5e7eb;
    }
    .items-table tr:last-child {
      border-bottom: none;
    }
    .items-table td {
      padding: 20px 8px;
      vertical-align: top;
    }
    .item-image-container {
      width: 80px;
      height: 80px;
      border-radius: 10px;
      overflow: hidden;
      background-color: #f3f4f6;
      border: 1px solid #e5e7eb;
      display: inline-block;
    }
    .item-image {
      width: 80px;
      height: 80px;
      object-fit: cover;
      display: block;
    }
    .item-details {
      padding-left: 15px;
    }
    .item-name {
      font-weight: 600;
      color: #111827;
      font-size: 16px;
      margin-bottom: 6px;
      display: block;
    }
    .item-quantity {
      font-size: 14px;
      color: #6b7280;
      display: block;
    }
    .item-price {
      text-align: right;
      font-weight: 600;
      font-size: 16px;
      color: #111827;
      white-space: nowrap;
    }
    .summary-table {
      width: 100%;
      max-width: 400px;
      margin: 30px 0 30px auto;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 12px 8px;
      border-bottom: 1px solid #f3f4f6;
    }
    .summary-table .label {
      color: #6b7280;
      font-size: 15px;
    }
    .summary-table .value {
      text-align: right;
      color: #111827;
      font-weight: 600;
      font-size: 15px;
    }
    .summary-table .total-row {
      border-top: 2px solid #111827;
      border-bottom: 2px solid #111827;
      background-color: #f9fafb;
    }
    .summary-table .total-row td {
      padding: 16px 8px;
      font-size: 20px;
      font-weight: 700;
    }
    .discount-row {
      color: #16a34a !important;
      background-color: #f0fdf4;
    }
    .discount-row .value {
      color: #16a34a !important;
    }
    .address-box {
      background: linear-gradient(135deg, #f6f8fc 0%, #eef2f7 100%);
      border-radius: 12px;
      padding: 24px;
      margin-top: 30px;
      border: 1px solid #e1e8ed;
    }
    .address-box h3 {
      margin: 0 0 16px;
      color: #111827;
      font-size: 18px;
      font-weight: 700;
    }
    .address-box p {
      margin: 0;
      color: #374151;
      line-height: 1.7;
      font-size: 15px;
    }
    .tracking-box {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin-top: 30px;
      border: 2px solid #93c5fd;
    }
    .tracking-box p {
      margin: 8px 0;
      color: #1e40af;
      font-size: 15px;
    }
    .tracking-box strong {
      font-size: 18px;
      font-weight: 700;
      color: #1e3a8a;
      font-family: 'Courier New', monospace;
    }
    .tracking-box .tracking-icon {
      font-size: 40px;
      margin-bottom: 10px;
    }
    .pending-box {
      margin-top: 30px;
      padding: 24px;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-radius: 12px;
      text-align: center;
      border: 2px solid #fbbf24;
    }
    .pending-box p {
      margin: 8px 0;
      color: #92400e;
      font-size: 15px;
      font-weight: 600;
    }
    .pending-box .pending-icon {
      font-size: 40px;
      margin-bottom: 10px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }
    .footer {
      text-align: center;
      padding: 30px 25px;
      background-color: #f9fafb;
      color: #6b7280;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .footer-links {
      margin: 20px 0;
      padding: 0;
    }
    .footer-links a {
      margin: 0 12px;
      color: #6b7280;
      font-size: 13px;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      color: #6b7280;
      text-decoration: none;
    }
    .highlight {
      color: #667eea;
      font-weight: 700;
    }
    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #e5e7eb, transparent);
      margin: 30px 0;
    }
    
    /* Responsive adjustments */
    @media only screen and (max-width: 600px) {
      .email-container {
        margin: 10px;
        border-radius: 8px;
      }
      .header {
        padding: 30px 20px;
      }
      .header h1 {
        font-size: 26px;
      }
      .body {
        padding: 30px 20px;
      }
      .order-info-cell {
        display: block;
        width: 100%;
        padding: 8px 0;
      }
      .item-image-container,
      .item-image {
        width: 60px;
        height: 60px;
      }
      .summary-table {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="emoji">🎉</div>
      <h1>Order Confirmed!</h1>
      <p>Thank you for shopping with us</p>
    </div>
    
    <div class="body">
      <p class="greeting">Hello <span class="highlight">{customerName}</span>,</p>
      <p>Great news! Your order has been confirmed and is being prepared with care. We're excited to get your items to you as quickly as possible.</p>

      <div class="order-info">
        <div class="order-info-grid">
          <div class="order-info-cell">
            <span class="label">Order Number</span>
            <div class="value">#{orderNumber}</div>
          </div>
          <div class="order-info-cell">
            <span class="label">Order Date</span>
            <div class="value">{orderDate}</div>
          </div>
        </div>
      </div>

      <h2 class="section-title">📦 Order Items</h2>
      <table class="items-table">
        {orderItems}
      </table>

      <div class="divider"></div>

      <table class="summary-table">
        <tr>
          <td class="label">Subtotal:</td>
          <td class="value">{subtotal}</td>
        </tr>
        {discountRow}
        <tr>
          <td class="label">Tax:</td>
          <td class="value">{tax}</td>
        </tr>
        <tr>
          <td class="label">Shipping:</td>
          <td class="value">{shipping}</td>
        </tr>
        <tr class="total-row">
          <td>Total:</td>
          <td style="text-align: right;">{total}</td>
        </tr>
      </table>

      {shippingAddress}
      {trackingInfo}

      <div style="text-align: center; margin: 40px 0;">
        <a href="{orderTrackingUrl}" class="cta-button">Track Your Order</a>
      </div>

      <p style="margin-top: 30px; font-size: 15px; color: #6b7280;">
        If you have any questions about your order, please don't hesitate to reach out to our support team. We're here to help!
      </p>
      
      <p style="margin-top: 30px;">
        Happy shopping! 🛍️<br>
        <span class="highlight">The Sellora Team</span>
      </p>
    </div>
    
    <div class="footer">
      <p style="font-weight: 600; color: #111827; margin-bottom: 15px;">© {currentYear} Sellora. All rights reserved.</p>
      
      <div class="footer-links">
        <a href="{websiteUrl}">Visit Store</a> •
        <a href="{websiteUrl}/account/orders">My Orders</a> •
        <a href="{websiteUrl}/support">Support</a>
      </div>

      <div class="social-links">
        <a href="#" style="text-decoration: none;">📘 Facebook</a>
        <a href="#" style="text-decoration: none;">📷 Instagram</a>
        <a href="#" style="text-decoration: none;">🐦 Twitter</a>
      </div>

      <div class="divider" style="margin: 20px auto; max-width: 200px;"></div>

      <p>
        Questions? Contact us at 
        <a href="mailto:{supportEmail}">{supportEmail}</a>
      </p>
      <p style="font-size: 12px; margin-top: 15px; color: #9ca3af;">
        This email was sent to <strong>{customerEmail}</strong><br>
        You're receiving this because you placed an order with Sellora.
      </p>
    </div>
  </div>
</body>
</html>
`;

// Helper function to populate the template
export function generateOrderConfirmationEmail(orderData: {
  customerName: string
  customerEmail: string
  orderNumber: string
  orderDate: string
  items: Array<{
    name: string
    image: string
    quantity: number
    price: string
  }>
  subtotal: string
  discount?: string
  couponCode?: string
  tax: string
  shipping: string
  total: string
  shippingAddress?: {
    firstName: string
    lastName: string
    address1: string
    address2?: string
    city: string
    state: string
    zipCode: string
    country: string
    phone?: string
  }
  trackingNumber?: string
  carrier?: string
}) {
  // Get base URL for images and links
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
  
  // Generate items HTML with FULL image URLs
  const itemsHtml = orderData.items.map(item => {
    // ✅ FIX: Ensure image URL is absolute
    let imageUrl = item.image
    if (imageUrl.startsWith('/')) {
      imageUrl = `${baseUrl}${imageUrl}`
    }
    
    return `
    <tr>
      <td style="width: 80px;">
        <div class="item-image-container">
          <img 
            src="${imageUrl}" 
            alt="${item.name}"
            class="item-image"
            style="display: block; width: 80px; height: 80px; object-fit: cover;"
          />
        </div>
      </td>
      <td class="item-details">
        <span class="item-name">${item.name}</span>
        <span class="item-quantity">Quantity: ${item.quantity}</span>
      </td>
      <td class="item-price">
        ${item.price}
      </td>
    </tr>
  `}).join('')

  // Generate discount row if applicable
  const discountRow = orderData.discount ? `
    <tr class="discount-row">
      <td class="label">
        Discount ${orderData.couponCode ? `(${orderData.couponCode})` : ''}:
      </td>
      <td class="value">-${orderData.discount}</td>
    </tr>
  ` : ''

  // Generate shipping address HTML if provided
  const shippingAddressHtml = orderData.shippingAddress ? `
    <div class="address-box">
      <h3>📍 Shipping Address</h3>
      <p>
        <strong>${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}</strong><br>
        ${orderData.shippingAddress.address1}<br>
        ${orderData.shippingAddress.address2 ? orderData.shippingAddress.address2 + '<br>' : ''}
        ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.zipCode}<br>
        ${orderData.shippingAddress.country}
        ${orderData.shippingAddress.phone ? '<br>📞 ' + orderData.shippingAddress.phone : ''}
      </p>
    </div>
  ` : ''

  // Generate tracking info HTML
  const trackingInfoHtml = orderData.trackingNumber ? `
    <div class="tracking-box">
      <div class="tracking-icon">📦</div>
      <p style="margin-bottom: 12px; font-weight: 700; font-size: 18px;">Your package is on its way!</p>
      <p style="font-size: 14px; margin-bottom: 8px;">Tracking Number:</p>
      <p><strong>${orderData.trackingNumber}</strong></p>
      ${orderData.carrier ? `<p style="font-size: 13px; margin-top: 8px;">Carrier: <strong>${orderData.carrier}</strong></p>` : ''}
    </div>
  ` : `
    <div class="pending-box">
      <div class="pending-icon">⏳</div>
      <p>Your order is being prepared and will ship soon!</p>
      <p style="font-size: 13px; margin-top: 8px;">We'll send you another email with tracking information once your order ships.</p>
    </div>
  `

  // Replace all placeholders
  return ORDER_CONFIRMATION_TEMPLATE
    .replace('{customerName}', orderData.customerName)
    .replace('{orderNumber}', orderData.orderNumber)
    .replace('{orderDate}', orderData.orderDate)
    .replace('{orderItems}', itemsHtml)
    .replace('{subtotal}', orderData.subtotal)
    .replace('{discountRow}', discountRow)
    .replace('{tax}', orderData.tax)
    .replace('{shipping}', orderData.shipping)
    .replace('{total}', orderData.total)
    .replace('{shippingAddress}', shippingAddressHtml)
    .replace('{trackingInfo}', trackingInfoHtml)
    .replace('{currentYear}', new Date().getFullYear().toString())
    .replace(/{supportEmail}/g, process.env.SENDLER_USER || 'support@sellora.com')
    .replace('{customerEmail}', orderData.customerEmail)
    .replace('{orderTrackingUrl}', `${baseUrl}/account/orders/${orderData.orderNumber}`)
    .replace(/{websiteUrl}/g, baseUrl)
}