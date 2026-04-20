import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/stripe';
import { markRegistrationPaid } from '@/lib/actions/payments';
import Stripe from 'stripe';

/**
 * Stripe Webhook Handler
 * Processes payment events from Stripe
 */
export async function POST(request: NextRequest) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return NextResponse.json(
            { error: 'Webhook secret not configured' },
            { status: 500 }
        );
    }

    try {
        // Get raw body for signature verification
        const body = await request.text();
        const signature = request.headers.get('stripe-signature');

        if (!signature) {
            return NextResponse.json(
                { error: 'Missing signature' },
                { status: 400 }
            );
        }

        // Verify webhook signature
        const event = verifyWebhookSignature(body, signature, webhookSecret);

        if (!event) {
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 400 }
            );
        }

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;

                // Extract metadata
                const { registrationId, eventId, userId } = session.metadata || {};

                if (!registrationId) {
                    console.error('Missing registrationId in metadata');
                    break;
                }

                // Mark registration as paid
                const result = await markRegistrationPaid(
                    registrationId,
                    session.id,
                    (session.amount_total || 0) / 100 // Convert paise to rupees
                );

                if (!result.success) {
                    console.error('Failed to update registration:', result.error);
                }

                console.log(`✅ Payment completed for registration ${registrationId}`);
                break;
            }

            case 'checkout.session.expired': {
                const session = event.data.object as Stripe.Checkout.Session;
                console.log(`⚠️ Checkout session expired: ${session.id}`);
                // Optionally: Update registration status to CANCELLED
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                console.error(`❌ Payment failed: ${paymentIntent.id}`);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

// Note: In Next.js App Router, request.text() automatically gets the raw body, 
// so we don't need the legacy bodyParser: false config.
