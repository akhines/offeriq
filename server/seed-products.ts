import { getUncachableStripeClient } from './stripeClient';

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.list({ limit: 100 });
  const existingNames = existingProducts.data.map(p => p.name);

  if (!existingNames.includes('OfferIQ Basic')) {
    console.log('Creating Basic plan...');
    const basic = await stripe.products.create({
      name: 'OfferIQ Basic',
      description: 'Essential underwriting tools for getting started. Includes AVM blending, offer calculator, and up to 10 saved deals.',
      metadata: {
        tier: 'basic',
        dealLimit: '10',
        features: 'AVM blending,Offer calculator,Offer ladder,Deal grading,Comparable sales,5 AI presentations/mo',
        order: '1',
      },
    });
    await stripe.prices.create({
      product: basic.id,
      unit_amount: 2900,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    await stripe.prices.create({
      product: basic.id,
      unit_amount: 29000,
      currency: 'usd',
      recurring: { interval: 'year' },
    });
    console.log('Basic plan created:', basic.id);
  } else {
    console.log('Basic plan already exists, skipping');
  }

  if (!existingNames.includes('OfferIQ Premium')) {
    console.log('Creating Premium plan...');
    const premium = await stripe.products.create({
      name: 'OfferIQ Premium',
      description: 'Full-featured underwriting suite with unlimited deals, AI negotiation plans, PDF sharing, and GoHighLevel CRM integration.',
      metadata: {
        tier: 'premium',
        dealLimit: 'unlimited',
        features: 'Everything in Basic,Unlimited saved deals,Unlimited AI presentations,PDF export & sharing,GoHighLevel integration,Compare deals side-by-side,Priority support',
        order: '2',
      },
    });
    await stripe.prices.create({
      product: premium.id,
      unit_amount: 7900,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    await stripe.prices.create({
      product: premium.id,
      unit_amount: 79000,
      currency: 'usd',
      recurring: { interval: 'year' },
    });
    console.log('Premium plan created:', premium.id);
  } else {
    console.log('Premium plan already exists, skipping');
  }

  console.log('Seed complete!');
}

seedProducts().catch(console.error);
