// Completion certificate, drawn as a landscape A4 PDF in the browser.
// jsPDF is loaded only when a certificate is made.

export interface CertificateDetails {
  fullName: string;
  studentCode: string;
  level: "A1" | "A2" | "B1";
  school?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export const CERTIFICATE_LEVELS: Record<CertificateDetails["level"], { en: string; es: string }> = {
  A1: { en: "A1 · Beginner", es: "A1 · Principiante" },
  A2: { en: "A2 · Elementary", es: "A2 · Elemental" },
  B1: { en: "B1 · Intermediate", es: "B1 · Intermedio" },
};

const NAVY: [number, number, number] = [11, 76, 156];
const RED: [number, number, number] = [209, 34, 41];
const GOLD: [number, number, number] = [245, 176, 22];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: (m || 1) - 1, d: d || 1 };
}
const dateEn = (iso: string) => { const p = parts(iso); return `${p.d} ${MONTHS_EN[p.m]} ${p.y}`; };
const dateEs = (iso: string) => { const p = parts(iso); return `${p.d} de ${MONTHS_ES[p.m]} de ${p.y}`; };

// The academy's logo (public/favicon.svg), redrawn with PDF shapes so it stays sharp.
function drawLogo(doc: any, x: number, y: number, size: number) {
  const k = size / 188;
  const px = (v: number) => x + (v - 66) * k;
  const py = (v: number) => y + (v - 75) * k;
  doc.setFillColor(...RED);
  doc.triangle(px(90), py(170), px(210), py(170), px(165), py(95), "F");
  doc.setFillColor(...GOLD);
  doc.circle(px(215), py(100), 18 * k, "F");
  doc.setFillColor(...NAVY);
  doc.triangle(px(95), py(195), px(95), py(255), px(170), py(255), "F");
  doc.setFillColor(...GOLD);
  doc.circle(px(190), py(225), 30 * k, "F");
}

export function certificateNumber(details: CertificateDetails) {
  return `ISE-${details.level}-${details.studentCode.replace(/[^A-Za-z0-9]/g, "")}-${details.endDate.replace(/-/g, "").slice(0, 6)}`;
}

export async function downloadCertificate(details: CertificateDetails) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const W = 297;
  const H = 210;
  const cx = W / 2;
  const level = CERTIFICATE_LEVELS[details.level];

  // Frame: navy outer border, thin gold inner line, coloured corner bars.
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(2.2);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.rect(14, 14, W - 28, H - 28);
  doc.setFillColor(...RED);
  doc.rect(10, 10, 46, 3, "F");
  doc.rect(W - 56, H - 13, 46, 3, "F");

  drawLogo(doc, cx - 9, 22, 18);

  const text = (value: string, y: number, size: number, style: "normal" | "bold" | "italic", color: [number, number, number], font = "helvetica") => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(value, cx, y, { align: "center" });
  };

  text("INICIATIVA SER O ESTAR", 48, 11, "bold", NAVY);
  text("Certificate of Completion", 64, 30, "bold", INK, "times");
  text("Certificado de finalización", 73, 14, "italic", MUTED, "times");

  text("This certifies that  ·  Se certifica que", 88, 10, "normal", MUTED);

  // Name, shrunk to fit long names on one line.
  doc.setFont("times", "bold");
  let nameSize = 34;
  doc.setFontSize(nameSize);
  while (doc.getTextWidth(details.fullName) > W - 70 && nameSize > 18) {
    nameSize -= 1;
    doc.setFontSize(nameSize);
  }
  text(details.fullName, 104, nameSize, "bold", NAVY, "times");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(cx - 70, 109, cx + 70, 109);

  text(`has successfully completed the Spanish course, level ${level.en}`, 120, 12.5, "normal", INK);
  text(`ha completado con éxito el curso de español, nivel ${level.es}`, 127, 10.5, "italic", MUTED);

  const span = `${dateEn(details.startDate)} – ${dateEn(details.endDate)}`;
  text(span, 139, 11, "bold", INK);
  if (details.school) text(details.school, 146, 10, "normal", MUTED);

  // Signature lines.
  const sigY = 172;
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.3);
  doc.line(48, sigY, 118, sigY);
  doc.line(W - 118, sigY, W - 48, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Director · Directora", 83, sigY + 5, { align: "center" });
  doc.text("Tutor · Tutora", W - 83, sigY + 5, { align: "center" });

  doc.setFontSize(8);
  doc.text(`Issued ${dateEn(details.endDate)} · Expedido el ${dateEs(details.endDate)}`, cx, 182, { align: "center" });
  doc.text(`No. ${certificateNumber(details)}  ·  iseroestar.com`, cx, 187, { align: "center" });

  const fileName = details.fullName.trim().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "");
  doc.save(`Certificate_${details.level}_${fileName || details.studentCode}.pdf`);
}
