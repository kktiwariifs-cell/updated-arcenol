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
    else if (upper.includes("INV")) gradeTag = "INV";
    else if (upper.includes("ESS")) gradeTag = "ESS";
    else if (upper.includes("VRLA")) gradeTag = "VRLA";
    else if (upper.includes("EV")) gradeTag = "EV";
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
  if (!serial) return { prefix: 'AESPL', grade: 'EV', suffix: '28G26001044' };
  
  const clean = String(serial).trim();

  // Pattern with spaces: e.g. "AESPL  EV  28G26001044" or "AESPL EV 28G26001044"
  const spaceParts = clean.split(/\s+/);
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
  
  // Pattern without spaces: e.g. "AESPLEV28G26001044"
  const matchUnspaced = clean.match(/^(AESPL)(EV|AUTO|INV|ESS|VRLA|[A-Z]{2,4})(\d{2}[A-Z]\d+)$/i);
  if (matchUnspaced) {
    return {
      prefix: matchUnspaced[1],
      grade: matchUnspaced[2],
      suffix: matchUnspaced[3]
    };
  }

  // Fallback for ARC- style: e.g. "ARC-72V30A-2026-183880"
  const matchArc = clean.match(/^(ARC-?)([A-Z0-9]+)?(-.*)?$/i);
  if (matchArc) {
    const rawGrade = matchArc[2] || 'EV';
    let grade = 'EV';
    if (rawGrade.includes('AUTO')) grade = 'AUTO';
    else if (rawGrade.includes('INV')) grade = 'INV';
    else if (rawGrade.includes('VRLA')) grade = 'VRLA';
    else if (rawGrade.includes('ESS')) grade = 'ESS';
    return {
      prefix: 'AESPL',
      grade: grade,
      suffix: (matchArc[3] || '').replace(/^-/, '')
    };
  }

  return { prefix: clean, grade: '', suffix: '' };
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
