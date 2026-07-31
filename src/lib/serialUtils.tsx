import React from 'react';

/**
 * Generates battery serial number following the pattern: AESPL  EV  28G26001044
 * - AESPL: Arcenol energy solutions pvt ltd
 * - EV: battery Grade (EV, AUTO, INV, VRLA, etc.)
 * - 28: 2-digit present date of month
 * - G: 1-character month in alphabetical order (A=Jan, B=Feb, ... G=Jul, L=Dec)
 * - 26: 2-digit year (e.g. 26 for 2026)
 * - 001044: 6-digit battery sequence/number
 */
export function normalizeToRevisedSerial(serial: string): string {
  if (!serial) return 'AESPL  EV  31G26001044';
  const clean = String(serial).trim();

  // If already matches standard revised pattern with spaces: e.g. "AESPL  EV  28G26001044" or "AESPL EV 28G26001044"
  const spaceMatch = clean.match(/^AESPL\s+([A-Z0-9]+)\s+([0-9]{2}[A-Z][0-9]{2,8})$/i);
  if (spaceMatch) {
    const grade = spaceMatch[1].toUpperCase();
    const suffix = spaceMatch[2].toUpperCase();
    return `AESPL  ${grade}  ${suffix}`;
  }

  // Handle hyphenated pattern e.g. "AESPL-BATNEXT200-26-1265" or "AESPL-72V30A-2026-9790" or "AESPL-EV-26-1265"
  const hyphenParts = clean.split('-');
  if (hyphenParts.length >= 2 && hyphenParts[0].toUpperCase() === 'AESPL') {
    const modelOrGrade = hyphenParts[1].toUpperCase();
    let grade = 'EV';
    if (modelOrGrade.includes('AUTO')) grade = 'AUTO';
    else if (modelOrGrade.includes('INV') || modelOrGrade.includes('NEXT') || modelOrGrade.includes('SOLAR') || modelOrGrade.includes('INVERTER') || modelOrGrade.includes('BATNEXT')) grade = 'INV';
    else if (modelOrGrade.includes('ESS')) grade = 'ESS';
    else if (modelOrGrade.includes('VRLA')) grade = 'VRLA';
    else if (modelOrGrade.includes('EV') || modelOrGrade.includes('72V') || modelOrGrade.includes('LIT') || modelOrGrade.includes('BIKE')) grade = 'EV';
    else {
      grade = modelOrGrade.replace(/[^A-Z]/g, '').slice(0, 4) || 'EV';
    }

    // Now extract date/seq parts
    const rest = hyphenParts.slice(2).join('');
    const digits = rest.replace(/[^0-9]/g, '');
    let year = '26';
    let seq = digits;
    if (digits.length >= 6) {
      seq = digits.slice(-6);
    } else if (digits.length > 0) {
      seq = digits.padStart(6, '0');
    } else {
      seq = '001044';
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthChar = String.fromCharCode(65 + now.getMonth());

    return `AESPL  ${grade}  ${day}${monthChar}${year}${seq}`;
  }

  // Handle ARC- style: e.g. "ARC-72V30A-2026-183880"
  const arcParts = clean.split('-');
  if (arcParts.length >= 2 && arcParts[0].toUpperCase() === 'ARC') {
    const modelOrGrade = arcParts[1].toUpperCase();
    let grade = 'EV';
    if (modelOrGrade.includes('AUTO')) grade = 'AUTO';
    else if (modelOrGrade.includes('INV') || modelOrGrade.includes('NEXT') || modelOrGrade.includes('SOLAR')) grade = 'INV';
    else if (modelOrGrade.includes('VRLA')) grade = 'VRLA';
    else if (modelOrGrade.includes('ESS')) grade = 'ESS';

    const rest = arcParts.slice(2).join('');
    const digits = rest.replace(/[^0-9]/g, '');
    const seq = digits ? digits.slice(-6).padStart(6, '0') : '001044';

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthChar = String.fromCharCode(65 + now.getMonth());

    return `AESPL  ${grade}  ${day}${monthChar}26${seq}`;
  }

  // Unspaced pattern e.g. "AESPLEV28G26001044" or "AESPLINV31G26001265"
  const unspaced = clean.match(/^AESPL([A-Z]{2,4})(\d{2}[A-Z]\d+)$/i);
  if (unspaced) {
    return `AESPL  ${unspaced[1].toUpperCase()}  ${unspaced[2].toUpperCase()}`;
  }

  return clean;
}

export function generateBatterySerial(gradeStr: string = "EV", seqNumber?: number | string): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  
  // Month in alphabetical order: Jan = A (code 65), Feb = B (66), ... Jul = G (71), Dec = L (76)
  const monthChar = String.fromCharCode(65 + now.getMonth());
  
  // 2-digit year (e.g., "26")
  const year2 = String(now.getFullYear()).slice(-2);

  // Grade: default "EV", or extract/normalize grade tag
  let gradeTag = "EV";
  if (gradeStr) {
    const upper = String(gradeStr).toUpperCase();
    if (upper.includes("AUTO")) gradeTag = "AUTO";
    else if (upper.includes("INV") || upper.includes("NEXT") || upper.includes("SOLAR") || upper.includes("INVERTER") || upper.includes("BATNEXT")) gradeTag = "INV";
    else if (upper.includes("ESS")) gradeTag = "ESS";
    else if (upper.includes("VRLA")) gradeTag = "VRLA";
    else if (upper.includes("EV") || upper.includes("72V") || upper.includes("LIT") || upper.includes("NMC") || upper.includes("RICK") || upper.includes("BIKE")) gradeTag = "EV";
    else {
      const clean = upper.replace(/[^A-Z]/g, "");
      gradeTag = clean.slice(0, 4) || "EV";
    }
  }

  // 6-digit battery number
  let numStr = "";
  if (seqNumber !== undefined && seqNumber !== null && String(seqNumber).trim() !== "") {
    const digitsOnly = String(seqNumber).replace(/[^0-9]/g, "");
    if (digitsOnly) {
      numStr = digitsOnly.padStart(6, "0");
    } else {
      numStr = String(Math.floor(1000 + Math.random() * 9000)).padStart(6, "0");
    }
  } else {
    numStr = String(Math.floor(1000 + Math.random() * 9000)).padStart(6, "0");
  }

  return `AESPL  ${gradeTag}  ${day}${monthChar}${year2}${numStr}`;
}

export function parseBatterySerial(serial: string) {
  if (!serial) return { prefix: 'AESPL', grade: 'EV', suffix: '31G26001044' };
  
  const norm = normalizeToRevisedSerial(serial);

  // Pattern with spaces: e.g. "AESPL  EV  28G26001044" or "AESPL EV 28G26001044"
  const spaceParts = norm.split(/\s+/);
  if (spaceParts.length >= 3 && spaceParts[0].toUpperCase() === 'AESPL') {
    return {
      prefix: spaceParts[0],
      grade: spaceParts[1],
      suffix: spaceParts.slice(2).join(' ')
    };
  }

  if (spaceParts.length === 2 && spaceParts[0].toUpperCase() === 'AESPL') {
    return {
      prefix: spaceParts[0],
      grade: spaceParts[1],
      suffix: ''
    };
  }
  
  return { prefix: norm, grade: 'EV', suffix: '' };
}

export interface FormattedSerialProps {
  serial: string;
  className?: string;
  gradeClassName?: string;
}

export const FormattedSerial: React.FC<FormattedSerialProps> = ({
  serial,
  className = "font-mono text-sm tracking-wider text-slate-900 inline-flex items-center gap-2",
  gradeClassName = "font-black text-slate-950 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md uppercase font-extrabold shadow-2xs"
}) => {
  const { prefix, grade, suffix } = parseBatterySerial(serial);

  if (!grade) {
    return <span className={className}>{serial}</span>;
  }

  return (
    <span className={className}>
      <span className="font-bold text-slate-700">{prefix}</span>
      <strong className={gradeClassName}>{grade}</strong>
      <span className="font-bold text-slate-700">{suffix}</span>
    </span>
  );
};
