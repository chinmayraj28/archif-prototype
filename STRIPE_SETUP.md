# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payment processing for your marketplace.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Stripe API keys (Secret Key and Publishable Key)

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key (test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key (optional, if needed)

# Webhook Secret (generated when setting up webhook endpoint)
STRIPE_WEBHOOK_SECRET=whsec_...

# Base URL for redirects
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Your application URL
```

## Setup Steps

### 1. Get Your Stripe API Keys

1. Log in to your Stripe Dashboard (https://dashboard.stripe.com)
2. Go to **Developers** → **API keys**
3. Copy your **Secret key** and add it to `.env` as `STRIPE_SECRET_KEY`
4. Copy your **Publishable key** if needed (currently not used but can be added)

### 2. Set Up Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set the endpoint URL to: `https://your-domain.com/api/payments/webhook`
   - For local development, use a tool like Stripe CLI or ngrok
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
5. Copy the **Signing secret** and add it to `.env` as `STRIPE_WEBHOOK_SECRET`

### 3. Local Development Webhook Testing

For local development, use Stripe CLI:

```bash
# Install Stripe CLI (if not installed)
# macOS: brew install stripe/stripe-cli/stripe
# Other platforms: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/payments/webhook
```

The CLI will display a webhook signing secret - use that for `STRIPE_WEBHOOK_SECRET` in your `.env` file.

## Payment Flow

1. **Offer Acceptance**: When an offer is accepted, payment status is set to "pending"
2. **Checkout Creation**: Buyer clicks "Complete Payment" button
3. **Stripe Checkout**: User is redirected to Stripe Checkout page
4. **Payment Processing**: User completes payment on Stripe
5. **Webhook Notification**: Stripe sends webhook to update payment status
6. **Listing Marked as Sold**: Once payment is confirmed, listing is marked as sold

## API Endpoints

- `POST /api/payments/create-checkout` - Creates Stripe checkout session
- `POST /api/payments/webhook` - Handles Stripe webhook events
- `GET /api/payments/verify?session_id=...` - Verifies payment status

## Pages

- `/payments/success` - Payment success page
- `/payments/cancel` - Payment cancellation page

## Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires 3D Secure: `4000 0027 6000 3184`

Any future expiration date and any 3-digit CVC will work.

## Production Checklist

- [ ] Replace test keys with live keys
- [ ] Update `NEXT_PUBLIC_BASE_URL` to production domain
- [ ] Set up production webhook endpoint in Stripe Dashboard
- [ ] Update webhook secret for production
- [ ] Test complete payment flow end-to-end
- [ ] Set up Stripe dashboard monitoring

## Support

For issues or questions:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com




