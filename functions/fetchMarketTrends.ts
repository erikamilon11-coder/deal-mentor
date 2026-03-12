import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { city, state } = await req.json();

    if (!city || !state) {
      return Response.json({ error: 'Missing city or state' }, { status: 400 });
    }

    // Fetch all property data in the market area
    const propertyDataList = await base44.entities.PropertyData.list();
    const leads = await base44.entities.Lead.list();

    // Filter properties in the same market
    const marketProperties = propertyDataList.filter((prop) => {
      const lead = leads.find((l) => l.id === prop.lead_id);
      return (
        lead &&
        lead.city?.toLowerCase() === city.toLowerCase() &&
        lead.state?.toLowerCase() === state.toLowerCase()
      );
    });

    if (marketProperties.length === 0) {
      return Response.json({
        success: true,
        trends: {
          average_price: 0,
          price_trend: 0,
          average_days_on_market: 0,
          market_velocity: 0,
          properties_analyzed: 0,
        },
        competitive_pricing: [],
        neighborhoods: [],
      });
    }

    // Calculate market trends
    const prices = marketProperties
      .filter((p) => p.estimated_value)
      .map((p) => p.estimated_value);

    const lastSalePrices = marketProperties
      .filter((p) => p.last_sale_price)
      .map((p) => p.last_sale_price);

    const average_price = prices.length > 0 ? prices.reduce((a, b) => a + b) / prices.length : 0;
    const average_last_sale = lastSalePrices.length > 0 ? lastSalePrices.reduce((a, b) => a + b) / lastSalePrices.length : 0;
    const price_trend = average_last_sale > 0 ? ((average_price - average_last_sale) / average_last_sale) * 100 : 0;

    // Calculate days on market average
    const lastSaleDates = marketProperties
      .filter((p) => p.last_sale_date)
      .map((p) => {
        const saleDate = new Date(p.last_sale_date);
        const daysSale = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, daysSale);
      });

    const average_days_on_market =
      lastSaleDates.length > 0
        ? lastSaleDates.reduce((a, b) => a + b) / lastSaleDates.length
        : 0;

    // Market velocity (sales activity)
    const recentSales = marketProperties.filter((p) => {
      if (!p.last_sale_date) return false;
      const saleDate = new Date(p.last_sale_date);
      const daysSince = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince <= 90;
    }).length;

    const market_velocity = (recentSales / marketProperties.length) * 100;

    // Price range analysis
    const priceRanges = {
      under_250k: prices.filter((p) => p < 250000).length,
      "250k_to_500k": prices.filter((p) => p >= 250000 && p < 500000).length,
      "500k_to_1m": prices.filter((p) => p >= 500000 && p < 1000000).length,
      over_1m: prices.filter((p) => p >= 1000000).length,
    };

    // Competitive pricing for similar properties
    const avgSquareFootage = marketProperties.filter((p) => p.square_footage).length > 0
      ? marketProperties.filter((p) => p.square_footage).reduce((sum, p) => sum + p.square_footage, 0) /
        marketProperties.filter((p) => p.square_footage).length
      : 0;

    const competitive_pricing = marketProperties
      .filter((p) => p.estimated_value && p.square_footage)
      .sort((a, b) => b.estimated_value - a.estimated_value)
      .slice(0, 10)
      .map((prop) => {
        const lead = leads.find((l) => l.id === prop.lead_id);
        return {
          address: lead?.property_address,
          price: prop.estimated_value,
          sqft: prop.square_footage,
          price_per_sqft: Math.round(prop.estimated_value / prop.square_footage),
          beds: prop.bedrooms,
          baths: prop.bathrooms,
        };
      });

    // Group by neighborhood (using zip codes)
    const neighborhoods = {};
    marketProperties.forEach((prop) => {
      const lead = leads.find((l) => l.id === prop.lead_id);
      const zip = lead?.zip_code || 'Unknown';

      if (!neighborhoods[zip]) {
        neighborhoods[zip] = {
          zip_code: zip,
          properties: [],
          average_price: 0,
          property_count: 0,
        };
      }

      neighborhoods[zip].properties.push(prop);
      neighborhoods[zip].property_count += 1;
    });

    // Calculate neighborhood stats
    const neighborhoodStats = Object.values(neighborhoods).map((area) => {
      const prices = area.properties.filter((p) => p.estimated_value).map((p) => p.estimated_value);
      const average_price = prices.length > 0 ? prices.reduce((a, b) => a + b) / prices.length : 0;

      return {
        zip_code: area.zip_code,
        property_count: area.property_count,
        average_price: Math.round(average_price),
        price_range: [Math.min(...prices), Math.max(...prices)],
        activity_level:
          area.property_count > 10 ? 'High' : area.property_count > 5 ? 'Medium' : 'Low',
      };
    });

    return Response.json({
      success: true,
      city,
      state,
      trends: {
        average_price: Math.round(average_price),
        price_trend: parseFloat(price_trend.toFixed(2)),
        average_days_on_market: Math.round(average_days_on_market),
        market_velocity: parseFloat(market_velocity.toFixed(1)),
        properties_analyzed: marketProperties.length,
        price_ranges: priceRanges,
      },
      competitive_pricing,
      neighborhoods: neighborhoodStats,
    });
  } catch (error) {
    console.error('Error fetching market trends:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch market trends' },
      { status: 500 }
    );
  }
});