import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id, property_data_id, criteria_id } = await req.json();

    if (!lead_id || !property_data_id || !criteria_id) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch property data
    const propertyDataList = await base44.entities.PropertyData.filter({ id: property_data_id });
    const propertyData = propertyDataList?.[0];

    if (!propertyData) {
      return Response.json({ error: 'Property data not found' }, { status: 404 });
    }

    // Fetch investment criteria
    const criteriaList = await base44.entities.InvestmentCriteria.filter({ id: criteria_id });
    const criteria = criteriaList?.[0];

    if (!criteria) {
      return Response.json({ error: 'Investment criteria not found' }, { status: 404 });
    }

    // Calculate offer using AVM valuation
    const arv = propertyData.estimated_value || 0;
    
    if (arv === 0) {
      return Response.json({ 
        error: 'No estimated value available. Please fetch property valuation first.' 
      }, { status: 400 });
    }

    // Calculate repair costs
    const repairCosts = arv * (criteria.repair_cost_percentage / 100);

    // Calculate desired profit
    const desiredProfit = arv * (criteria.target_roi_percentage / 100);

    // Calculate closing costs
    const closingCostPercentage = criteria.closing_cost_percentage || 2;
    
    // Calculate maximum allowable offer (MAO)
    const maoDiscount = criteria.max_offer_discount / 100;
    const mao = arv * (1 - maoDiscount) - repairCosts - desiredProfit;

    // Calculate optimal offer (leave room for negotiation)
    const optimalOffer = Math.max(mao * 0.95, mao - 10000); // 95% of MAO or $10k less

    // Create the offer record
    const offer = await base44.entities.Offer.create({
      lead_id,
      arv,
      estimated_repairs: repairCosts,
      maximum_allowable_offer: mao,
      offer_price: optimalOffer,
      assignment_fee_target: criteria.assignment_fee_target || 0,
      outcome: 'Pending',
    });

    // Auto-generate contract if offer is accepted in calculation
    const contract = await base44.entities.Contract.create({
      lead_id,
      purchase_price: optimalOffer,
      status: 'Draft',
      document_link: '',
    });

    return Response.json({
      success: true,
      offer: offer,
      contract: contract,
      calculation: {
        arv,
        repair_costs: repairCosts,
        desired_profit: desiredProfit,
        maximum_allowable_offer: mao,
        offer_price: optimalOffer,
        roi_percentage: criteria.target_roi_percentage,
      }
    });
  } catch (error) {
    console.error('Auto-generate offer error:', error);
    return Response.json(
      { error: error.message || 'Failed to generate offer' },
      { status: 500 }
    );
  }
});