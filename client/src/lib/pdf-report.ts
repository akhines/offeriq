import { jsPDF } from "jspdf";
import type {
  PropertyInfo,
  SellerInfo,
  UnderwritingOutput,
  OfferOutput,
  PresentationOutput,
  PresentationInput,
  OfferSettings,
} from "@/types";

export interface PdfReportData {
  property: PropertyInfo;
  seller: SellerInfo;
  underwritingOutput: UnderwritingOutput | null;
  offerOutput: OfferOutput | null;
  offerSettings?: OfferSettings;
  presentationOutput: PresentationOutput | null;
  presentationInput: PresentationInput;
  propertyAddress?: string;
  manualARV?: number;
  manualRepairs?: number;
}

const BRAND_GREEN = [22, 163, 74] as const;
const BRAND_GREEN_LIGHT = [240, 253, 244] as const;
const DARK_TEXT = [17, 24, 39] as const;
const MID_TEXT = [75, 85, 99] as const;
const LIGHT_TEXT = [107, 114, 128] as const;
const WHITE = [255, 255, 255] as const;
const BORDER_COLOR = [229, 231, 235] as const;
const BG_LIGHT = [249, 250, 251] as const;

const GRADE_COLORS: Record<string, readonly [number, number, number]> = {
  A: [22, 163, 74],
  B: [37, 99, 235],
  C: [234, 179, 8],
  D: [220, 38, 38],
};

function fmt(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "--";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function pct(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return "--";
  return n.toFixed(1) + "%";
}

export function generateProfessionalPdf(data: PdfReportData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 18;
  const mr = 18;
  const cw = pw - ml - mr;
  let y = 0;

  const checkPage = (needed: number) => {
    if (y + needed > ph - 25) {
      doc.addPage();
      y = 20;
      doc.setFillColor(BRAND_GREEN[0], BRAND_GREEN[1], BRAND_GREEN[2]);
      doc.rect(0, 0, pw, 6, "F");
    }
  };

  const setColor = (c: readonly [number, number, number]) => {
    doc.setTextColor(c[0], c[1], c[2]);
  };

  const drawSectionTitle = (title: string) => {
    checkPage(14);
    doc.setFillColor(BRAND_GREEN[0], BRAND_GREEN[1], BRAND_GREEN[2]);
    doc.roundedRect(ml, y, 3, 8, 1, 1, "F");
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    setColor(DARK_TEXT);
    doc.text(title, ml + 7, y + 6);
    y += 14;
  };

  const drawSubTitle = (title: string) => {
    checkPage(10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(DARK_TEXT);
    doc.text(title, ml, y);
    y += 5;
  };

  const drawParagraph = (text: string, fontSize = 9) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    setColor(MID_TEXT);
    const lines = doc.splitTextToSize(text, cw);
    lines.forEach((line: string) => {
      checkPage(5);
      doc.text(line, ml, y);
      y += fontSize * 0.45;
    });
    y += 3;
  };

  const drawBullet = (text: string, indent = 0) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(MID_TEXT);
    const bulletX = ml + indent;
    const textX = bulletX + 4;
    const lines = doc.splitTextToSize(text, cw - indent - 4);
    lines.forEach((line: string, i: number) => {
      checkPage(5);
      if (i === 0) {
        doc.setFillColor(BRAND_GREEN[0], BRAND_GREEN[1], BRAND_GREEN[2]);
        doc.circle(bulletX + 1, y - 1, 0.8, "F");
      }
      doc.text(line, textX, y);
      y += 4;
    });
    y += 1;
  };

  const drawKeyValueRow = (label: string, value: string, bgAlt = false) => {
    checkPage(7);
    if (bgAlt) {
      doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
      doc.rect(ml, y - 4, cw, 7, "F");
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(MID_TEXT);
    doc.text(label, ml + 3, y);
    doc.setFont("helvetica", "bold");
    setColor(DARK_TEXT);
    doc.text(value, pw - mr - 3, y, { align: "right" });
    y += 7;
  };

  const drawHorizontalBar = (x: number, barY: number, width: number, height: number, fillPct: number, fillColor: readonly [number, number, number]) => {
    doc.setFillColor(229, 231, 235);
    doc.roundedRect(x, barY, width, height, height / 2, height / 2, "F");
    if (fillPct > 0) {
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      const fillWidth = Math.max(height, width * Math.min(fillPct / 100, 1));
      doc.roundedRect(x, barY, fillWidth, height, height / 2, height / 2, "F");
    }
  };


  doc.setFillColor(BRAND_GREEN[0], BRAND_GREEN[1], BRAND_GREEN[2]);
  doc.rect(0, 0, pw, 8, "F");

  y = 22;
  doc.setFillColor(BRAND_GREEN_LIGHT[0], BRAND_GREEN_LIGHT[1], BRAND_GREEN_LIGHT[2]);
  doc.roundedRect(ml, y - 8, cw, 58, 3, 3, "F");

  doc.setFillColor(BRAND_GREEN[0], BRAND_GREEN[1], BRAND_GREEN[2]);
  doc.circle(ml + 12, y + 4, 8, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("OQ", ml + 12, y + 5.5, { align: "center" });

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  setColor(DARK_TEXT);
  doc.text("Deal Analysis Report", ml + 24, y + 3);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(BRAND_GREEN);
  doc.text("Powered by OfferIQ  |  3-Engine Underwriter", ml + 24, y + 10);

  y += 20;
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.line(ml + 4, y, pw - mr - 4, y);
  y += 6;

  if (data.propertyAddress) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    setColor(DARK_TEXT);
    doc.text(data.propertyAddress, ml + 4, y + 2);
    y += 8;
  }

  const propDetails: string[] = [];
  if (data.property.beds) propDetails.push(`${data.property.beds} Bed`);
  if (data.property.baths) propDetails.push(`${data.property.baths} Bath`);
  if (data.property.sqft) propDetails.push(`${data.property.sqft.toLocaleString()} SqFt`);
  if (data.property.yearBuilt) propDetails.push(`Built ${data.property.yearBuilt}`);
  if (data.property.propertyType) propDetails.push(data.property.propertyType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));

  if (propDetails.length) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(MID_TEXT);
    doc.text(propDetails.join("   |   "), ml + 4, y + 2);
    y += 6;
  }

  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(LIGHT_TEXT);
  doc.text(`Report Generated: ${dateStr}`, ml + 4, y + 2);

  y += 12;

  const uw = data.underwritingOutput;
  const oo = data.offerOutput;

  if (uw || oo) {
    const cardWidth = (cw - 8) / 4;
    const cardH = 22;
    const cx = ml;

    const summaryCards = [
      { label: "As-Is Value", value: fmt(uw?.asIsBase), color: DARK_TEXT },
      { label: "ARV", value: fmt(data.manualARV || uw?.arv), color: BRAND_GREEN },
      { label: "Seller Offer", value: fmt(oo?.sellerOffer), color: DARK_TEXT },
      { label: "Deal Grade", value: oo?.dealGrade || "--", color: GRADE_COLORS[oo?.dealGrade || "D"] || DARK_TEXT },
    ];

    summaryCards.forEach((card, i) => {
      const x = cx + i * (cardWidth + 2.5);
      doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
      doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
      doc.roundedRect(x, y, cardWidth, cardH, 2, 2, "FD");

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      setColor(LIGHT_TEXT);
      doc.text(card.label, x + cardWidth / 2, y + 7, { align: "center" });

      doc.setFontSize(card.label === "Deal Grade" ? 16 : 13);
      doc.setFont("helvetica", "bold");
      setColor(card.color);
      doc.text(card.value, x + cardWidth / 2, y + 17, { align: "center" });
    });

    y += cardH + 10;
  }


  if (uw) {
    drawSectionTitle("Valuation Analysis");

    drawSubTitle("As-Is Value Range");
    const rangeBarY = y;
    const rangeWidth = cw - 20;

    doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
    doc.roundedRect(ml, rangeBarY - 2, cw, 20, 2, 2, "F");

    const low = uw.asIsLow;
    const high = uw.asIsHigh;
    const base = uw.asIsBase;
    const range = high - low || 1;
    const basePct = ((base - low) / range) * 100;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(LIGHT_TEXT);
    doc.text("Low", ml + 5, rangeBarY + 2);
    doc.text("Base", ml + 5 + rangeWidth * (basePct / 100), rangeBarY + 2, { align: "center" });
    doc.text("High", ml + 5 + rangeWidth, rangeBarY + 2, { align: "right" });

    drawHorizontalBar(ml + 5, rangeBarY + 5, rangeWidth, 3, 100, BORDER_COLOR);

    doc.setFillColor(BRAND_GREEN[0], BRAND_GREEN[1], BRAND_GREEN[2]);
    doc.circle(ml + 5 + rangeWidth * (basePct / 100), rangeBarY + 6.5, 2.5, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    setColor(DARK_TEXT);
    doc.text(fmt(low), ml + 5, rangeBarY + 14);
    doc.text(fmt(base), ml + 5 + rangeWidth * (basePct / 100), rangeBarY + 14, { align: "center" });
    doc.text(fmt(high), ml + 5 + rangeWidth, rangeBarY + 14, { align: "right" });

    y = rangeBarY + 22;

    drawSubTitle("Valuation Breakdown");
    drawKeyValueRow("As-Is Base Value", fmt(uw.asIsBase), false);
    drawKeyValueRow("After Repair Value (ARV)", fmt(data.manualARV || uw.arv), true);
    drawKeyValueRow("Repairs (Base Estimate)", fmt(data.manualRepairs || uw.repairBase), false);
    drawKeyValueRow("Repairs Range", `${fmt(uw.repairLow)} - ${fmt(uw.repairHigh)}`, true);
    drawKeyValueRow("Marketability Discount", pct(uw.marketabilityDiscount), false);

    y += 4;
    drawSubTitle("Confidence Score");
    drawHorizontalBar(ml, y, cw * 0.6, 4, uw.confidenceScore, BRAND_GREEN);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(BRAND_GREEN);
    doc.text(`${uw.confidenceScore}%`, ml + cw * 0.6 + 5, y + 3);
    y += 10;

    if (uw.drivers?.length) {
      drawSubTitle("Key Confidence Drivers");
      uw.drivers.forEach(d => drawBullet(d));
      y += 3;
    }

    if (uw.missingData?.length) {
      drawSubTitle("Missing Data Points");
      uw.missingData.forEach(d => drawBullet(d));
      y += 3;
    }

    if (uw.avmBlendUsed?.length) {
      drawSubTitle("AVM Blend Breakdown");
      uw.avmBlendUsed.forEach((blend, i) => {
        drawKeyValueRow(
          `${blend.source} (${pct(blend.weight * 100)})`,
          fmt(blend.value),
          i % 2 === 1
        );
      });
      y += 3;
    }
  }


  if (oo) {
    checkPage(40);
    drawSectionTitle("Offer Strategy");

    const stratLabel = data.offerSettings?.strategy
      ? data.offerSettings.strategy.charAt(0).toUpperCase() + data.offerSettings.strategy.slice(1)
      : "Wholesale";

    drawKeyValueRow("Strategy", stratLabel, false);
    drawKeyValueRow("Investor Buy Price", fmt(oo.investorBuyPrice), true);
    drawKeyValueRow("Seller Offer (Fair)", fmt(oo.sellerOffer), false);
    drawKeyValueRow("Profit Margin", fmt(oo.margin) + ` (${pct(oo.marginPct)})`, true);
    if (data.offerSettings) {
      drawKeyValueRow("Profit Target", pct(data.offerSettings.profitPct), false);
      drawKeyValueRow("Closing Cost %", pct(data.offerSettings.closingCostPct), true);
    }
    y += 5;

    drawSubTitle("3-Tier Offer Ladder");
    if (oo.offerLadder?.length) {
      const ladderTopY = y;
      const tierWidth = (cw - 8) / 3;

      oo.offerLadder.forEach((tier, i) => {
        const tx = ml + i * (tierWidth + 4);
        const isMiddle = i === 1;

        if (isMiddle) {
          doc.setFillColor(BRAND_GREEN_LIGHT[0], BRAND_GREEN_LIGHT[1], BRAND_GREEN_LIGHT[2]);
          doc.setDrawColor(BRAND_GREEN[0], BRAND_GREEN[1], BRAND_GREEN[2]);
        } else {
          doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
          doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
        }
        doc.roundedRect(tx, ladderTopY, tierWidth, 32, 2, 2, "FD");

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setColor(isMiddle ? BRAND_GREEN : MID_TEXT);
        doc.text(tier.name.toUpperCase(), tx + tierWidth / 2, ladderTopY + 7, { align: "center" });

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        setColor(DARK_TEXT);
        doc.text(fmt(tier.price), tx + tierWidth / 2, ladderTopY + 16, { align: "center" });

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        setColor(LIGHT_TEXT);
        const useLines = doc.splitTextToSize(tier.useWhen, tierWidth - 6);
        useLines.slice(0, 2).forEach((line: string, li: number) => {
          doc.text(line, tx + tierWidth / 2, ladderTopY + 22 + li * 3.5, { align: "center" });
        });
      });

      y = ladderTopY + 38;
    }

    drawSubTitle("Deal Grade");
    const gradeColor = GRADE_COLORS[oo.dealGrade] || DARK_TEXT;
    doc.setFillColor(gradeColor[0], gradeColor[1], gradeColor[2]);
    doc.roundedRect(ml, y - 1, 14, 14, 3, 3, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(oo.dealGrade, ml + 7, y + 9, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(MID_TEXT);
    const gradeDesc: Record<string, string> = {
      A: "High confidence, strong margin, adequate buffers. Proceed with confidence.",
      B: "Decent confidence and margin. Good deal with manageable risk.",
      C: "Lower confidence or margin. Requires careful consideration.",
      D: "Risky deal. Significant concerns about margin or data quality.",
    };
    doc.text(gradeDesc[oo.dealGrade] || "", ml + 18, y + 5);
    y += 18;

    if (oo.sensitivity?.length) {
      drawSubTitle("Sensitivity Notes");
      oo.sensitivity.forEach(s => drawBullet(s));
      y += 3;
    }
  }


  const po = data.presentationOutput;
  if (po) {
    checkPage(30);
    drawSectionTitle("Negotiation Strategy");

    if (po.sellerSummary) {
      drawSubTitle("Seller Summary");
      drawParagraph(po.sellerSummary);
    }

    if (po.motivationHypotheses?.length) {
      drawSubTitle("Motivation Hypotheses");
      po.motivationHypotheses.forEach(h => {
        const confColor = h.confidence === "high" ? BRAND_GREEN : h.confidence === "medium" ? ([234, 179, 8] as const) : LIGHT_TEXT;
        checkPage(6);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        setColor(confColor);
        doc.text(`[${h.confidence.toUpperCase()}]`, ml + 5, y);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        setColor(MID_TEXT);
        const lines = doc.splitTextToSize(h.hypothesis, cw - 25);
        lines.forEach((line: string, li: number) => {
          checkPage(5);
          doc.text(line, ml + 22, y + (li * 4));
        });
        y += Math.max(lines.length * 4, 5) + 2;
      });
      y += 3;
    }

    if (po.communicationCues?.length) {
      drawSubTitle("Communication Cues (DISC)");
      po.communicationCues.forEach(c => drawBullet(c));
      y += 3;
    }

    if (po.sixNeedsMapping?.length) {
      drawSubTitle("6 Human Needs Mapping");
      po.sixNeedsMapping.forEach(m => {
        checkPage(10);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        setColor(BRAND_GREEN);
        doc.text(m.need + ":", ml + 5, y);
        doc.setFont("helvetica", "normal");
        setColor(MID_TEXT);
        const lines = doc.splitTextToSize(m.hypothesis, cw - 30);
        lines.forEach((line: string, li: number) => {
          checkPage(5);
          doc.text(line, ml + 30, y + (li * 4));
        });
        y += Math.max(lines.length * 4, 5) + 2;
      });
      y += 3;
    }

    if (po.recommendedOfferTier) {
      drawSubTitle("Recommended Offer Tier");
      const tierLabels: Record<string, string> = {
        fast_yes: "Fast Yes (+8%) -- For quick closes, motivated sellers",
        fair: "Fair (Baseline) -- Balanced offer with room for negotiation",
        stretch: "Stretch (-8%) -- For flexible sellers, distressed properties",
      };
      checkPage(8);
      doc.setFillColor(BRAND_GREEN_LIGHT[0], BRAND_GREEN_LIGHT[1], BRAND_GREEN_LIGHT[2]);
      doc.roundedRect(ml, y - 3, cw, 10, 2, 2, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      setColor(BRAND_GREEN);
      doc.text(tierLabels[po.recommendedOfferTier] || po.recommendedOfferTier, ml + 5, y + 3);
      y += 14;
    }

    if (po.talkTrackSoft) {
      drawSubTitle("Talk Track -- Soft Approach");
      drawParagraph(po.talkTrackSoft);
    }

    if (po.talkTrackDirect) {
      drawSubTitle("Talk Track -- Direct Approach");
      drawParagraph(po.talkTrackDirect);
    }

    if (po.offerPackagingPlan) {
      drawSubTitle("Offer Packaging Plan");
      drawParagraph(po.offerPackagingPlan);
    }

    if (po.objectionHandling?.length) {
      drawSubTitle("Objection Handling");
      po.objectionHandling.forEach(obj => {
        if (typeof obj === "string") {
          drawBullet(obj);
        } else {
          const o = obj as unknown as { Objection?: string; Response?: string; objection?: string; response?: string };
          const objection = o.Objection || o.objection || "";
          const response = o.Response || o.response || "";
          checkPage(12);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          setColor(DARK_TEXT);
          const qLines = doc.splitTextToSize(`Q: "${objection}"`, cw - 10);
          qLines.forEach((line: string) => {
            checkPage(5);
            doc.text(line, ml + 5, y);
            y += 4;
          });
          y += 1;
          doc.setFont("helvetica", "normal");
          setColor(MID_TEXT);
          const aLines = doc.splitTextToSize(`A: ${response}`, cw - 10);
          aLines.forEach((line: string) => {
            checkPage(5);
            doc.text(line, ml + 5, y);
            y += 4;
          });
          y += 3;
        }
      });
      y += 3;
    }

    if (po.nextActions?.length) {
      drawSubTitle("Next Actions");
      po.nextActions.forEach((a, i) => {
        checkPage(6);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        setColor(MID_TEXT);
        doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
        doc.roundedRect(ml + 3, y - 3, 3.5, 3.5, 0.5, 0.5, "S");
        const lines = doc.splitTextToSize(`${i + 1}. ${a}`, cw - 12);
        lines.forEach((line: string, li: number) => {
          checkPage(5);
          doc.text(line, ml + 9, y + (li * 4));
        });
        y += Math.max(lines.length * 4, 4) + 2;
      });
      y += 3;
    }

    if (po.followUpCadence) {
      drawSubTitle("Follow-Up Cadence");
      drawParagraph(po.followUpCadence);
    }
  }

  if (data.presentationInput.compLinks?.length) {
    checkPage(12);
    drawSubTitle("Supporting Comp Links");
    data.presentationInput.compLinks.forEach(link => {
      drawBullet(link.label ? `${link.label}: ${link.url}` : link.url);
    });
  }


  checkPage(25);
  y += 5;
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.line(ml, y, pw - mr, y);
  y += 8;
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  setColor(LIGHT_TEXT);
  const disclaimers = [
    "This report is generated by OfferIQ for informational purposes only and does not constitute financial, legal, or investment advice.",
    "All valuations are estimates based on available data and should be independently verified before making investment decisions.",
    "DISC profiles and Human Needs assessments are hypotheses for conversational guidance, not clinical diagnoses.",
    "Confidential -- Not for public distribution without authorization.",
  ];
  disclaimers.forEach(d => {
    const lines = doc.splitTextToSize(d, cw);
    lines.forEach((line: string) => {
      checkPage(4);
      doc.text(line, ml, y);
      y += 3;
    });
    y += 1;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = ph - 8;
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.line(ml, footerY, pw - mr, footerY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(LIGHT_TEXT);
    doc.text("OfferIQ  |  Confidential Deal Analysis", ml, footerY + 4);
    doc.text(`Page ${i} of ${totalPages}`, pw - mr, footerY + 4, { align: "right" });
    doc.text(dateStr, pw / 2, footerY + 4, { align: "center" });
  }

  return doc;
}
