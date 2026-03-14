export const DEAL_STAGE_SEQUENCE = [
  "Lead Captured",
  "Reviewing Opportunity",
  "Seller Contact",
  "Deal Analysis",
  "Offer Prepared",
  "Follow-Up Active",
  "Under Contract",
  "Closing in Progress",
  "Closed / Archived",
];

const VALID_STAGE_SET = new Set(DEAL_STAGE_SEQUENCE);
const STAGE_PERSISTENCE_FIELDS = ["deal_stage", "deal_stage_manual", "deal_stage_updated_date"];

const STAGE_NEXT_STEPS = {
  "Lead Captured": "Review lead details and fill missing owner/contact fields.",
  "Reviewing Opportunity": "Confirm motivation and decide whether to begin seller contact.",
  "Seller Contact": "Log outreach outcome and create the next follow-up task.",
  "Deal Analysis": "Validate numbers (ARV, repairs, fees) before preparing your offer.",
  "Offer Prepared": "Generate contract draft and verify purchase price + close timeline.",
  "Follow-Up Active": "Follow up on seller decision and resolve objections quickly.",
  "Under Contract": "Create closing tasks and confirm title, escrow, and key dates.",
  "Closing in Progress": "Track checklist completion until final signatures and close.",
  "Closed / Archived": "Archive notes, outcomes, and lessons for future deals.",
};

const STAGE_VERIFY = {
  "Lead Captured": "Verify property address, city/state/ZIP.",
  "Reviewing Opportunity": "Verify condition clues, source, and motivation signals.",
  "Seller Contact": "Verify seller timeline, price expectation, and decision maker.",
  "Deal Analysis": "Verify repair assumptions and exit margin.",
  "Offer Prepared": "Verify seller name, purchase price, and closing date.",
  "Follow-Up Active": "Verify next touchpoint date/time is scheduled.",
  "Under Contract": "Verify title order, earnest money, and inspection milestones.",
  "Closing in Progress": "Verify all checklist items and buyer coordination.",
  "Closed / Archived": "Verify all documents are uploaded and notes are complete.",
};

const STAGE_MISTAKE = {
  "Lead Captured": "Avoid waiting for perfect data before saving the lead.",
  "Reviewing Opportunity": "Avoid skipping missing-data review before outreach.",
  "Seller Contact": "Avoid ending contact without scheduling the next follow-up.",
  "Deal Analysis": "Avoid offering before checking your numbers.",
  "Offer Prepared": "Avoid sending contracts with unchecked seller details.",
  "Follow-Up Active": "Avoid letting this lead go cold after sending an offer.",
  "Under Contract": "Avoid assuming under-contract means done.",
  "Closing in Progress": "Avoid losing momentum on title and paperwork tasks.",
  "Closed / Archived": "Avoid closing files without documenting outcomes.",
};

export function getSuggestedLeadDealStage(lead) {
  const status = lead?.status;

  if (status === "Closed" || status === "Dead") return "Closed / Archived";
  if (status === "Under Contract") {
    return lead?.signed_date || lead?.docusign_status === "completed"
      ? "Closing in Progress"
      : "Under Contract";
  }
  if (status === "Offer Sent") return "Follow-Up Active";
  if (status === "Talking") return "Offer Prepared";
  if (status === "Responded") return "Deal Analysis";
  if (status === "Contacted") return "Seller Contact";

  const hasCoreReviewData = Boolean(
    lead?.owner || lead?.phone || lead?.email || lead?.notes || lead?.message
  );
  return hasCoreReviewData ? "Reviewing Opportunity" : "Lead Captured";
}

export function getLeadDealStage(lead) {
  const manualStage = lead?.deal_stage;
  const isManual = parseDealStageManualValue(lead?.deal_stage_manual);

  if (isManual && manualStage && VALID_STAGE_SET.has(manualStage)) {
    return manualStage;
  }

  return getSuggestedLeadDealStage(lead);
}

export function getLeadDealStageMeta(lead) {
  const suggestedStage = getSuggestedLeadDealStage(lead);
  const stage = getLeadDealStage(lead);
  const index = Math.max(0, DEAL_STAGE_SEQUENCE.indexOf(stage));
  const hasManualOverride = parseDealStageManualValue(lead?.deal_stage_manual) && stage !== suggestedStage;

  return {
    stage,
    suggestedStage,
    index,
    total: DEAL_STAGE_SEQUENCE.length,
    stageSource: hasManualOverride ? "manual" : "auto",
    hasManualOverride,
    stageUpdatedDate: lead?.deal_stage_updated_date || null,
    nextStep: STAGE_NEXT_STEPS[stage],
    verify: STAGE_VERIFY[stage],
    commonMistake: STAGE_MISTAKE[stage],
  };
}

export function getStagePersistenceFields(lead, { manual = false, updatedDate = null } = {}) {
  const inferredStage = getSuggestedLeadDealStage(lead);

  return {
    deal_stage: inferredStage,
    deal_stage_manual: manual,
    ...(updatedDate ? { deal_stage_updated_date: updatedDate } : {}),
  };
}

export function parseDealStageManualValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalizedValue)) return true;
    if (["false", "0", "no", ""].includes(normalizedValue)) return false;
  }
  return false;
}

export function shouldRetryWithoutStagePersistence(error) {
  const message = [error?.message, error?.details, error?.error]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return STAGE_PERSISTENCE_FIELDS.some((field) => message.includes(field));
}

export function isOpaqueStagePersistenceRisk(error) {
  const status = Number(error?.status || error?.statusCode || error?.response?.status || 0);
  const message = [error?.message, error?.details, error?.error]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const isValidationLikeStatus = [400, 409, 422].includes(status);
  const isGenericValidationMessage =
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("bad request") ||
    message.includes("payload") ||
    message.includes("schema");

  return !shouldRetryWithoutStagePersistence(error) && isValidationLikeStatus && isGenericValidationMessage;
}

export function stripStagePersistenceFields(leadPayload) {
  const payloadWithoutStage = { ...leadPayload };
  STAGE_PERSISTENCE_FIELDS.forEach((field) => {
    delete payloadWithoutStage[field];
  });
  return payloadWithoutStage;
}

export async function createLeadWithStageFallback(createLeadFn, leadPayload, options = {}) {
  const { onFallbackUsed, onOpaqueStagePersistenceRisk } = options;

  try {
    const lead = await createLeadFn(leadPayload);
    return { lead, fallbackUsed: false, opaqueStagePersistenceRisk: false };
  } catch (error) {
    if (!shouldRetryWithoutStagePersistence(error)) {
      if (isOpaqueStagePersistenceRisk(error)) {
        error.stagePersistenceRiskDetected = true;
        onOpaqueStagePersistenceRisk?.(error);
      }
      throw error;
    }

    console.warn("Lead create failed with stage persistence fields. Retrying without stage fields.", error);
    onFallbackUsed?.(error);
    const lead = await createLeadFn(stripStagePersistenceFields(leadPayload));
    return { lead, fallbackUsed: true, opaqueStagePersistenceRisk: false };
  }
}
