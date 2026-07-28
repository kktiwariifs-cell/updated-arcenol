/**
 * Generates battery serial number following the pattern: AESPLEV28G26001044
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

  return `AESPL${gradeTag}${day}${monthChar}${year2}${numStr}`;
}
