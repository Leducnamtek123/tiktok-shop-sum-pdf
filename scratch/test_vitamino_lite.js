const fs = require('fs');

function cleanItemProductName(rawName) { return (rawName || '').trim(); }

function containsWholeWord(haystack, needle) {
  if (!haystack || !needle) return false;
  const escaped = needle.trim().replace(/[\.\*\+\?\^\(\)\[\]\{\}\\\|\/]/g, '\\$&');
  const regex = new RegExp('(?:^|[^a-zA-Z0-9À-ỹ])' + escaped + '(?:$|[^a-zA-Z0-9À-ỹ])', 'i');
  return regex.test(haystack);
}

function getProductTokens(str) {
  if (!str) return [];
  const sClean = str.replace(/\b\d+\s*(?:ml|g|kg|l|chai|goi|hop|can)\b/gi, '');
  const words = sClean.toLowerCase().match(/[a-zA-Z0-9À-ỹ]+/g) || [];
  const noise = new Set(['combo', 'navet', 'bo', 'sung', 'cho', 'giup', 'va', 'cua', 'loai', 'thu', 'cung', 'chong', 'tri', 'sau', 'tiem', 'phong', 'vac', 'xin', 'dac', 'tri']);
  return words.filter(w => w.length >= 2 && !noise.has(w));
}

function getProductDosageTokens(str) {
  if (!str) return new Set();
  const sNoVol = str.replace(/\b\d+\s*(?:ml|l|lit|lít|g|gam|kg|cc)\b/gi, '');
  const matches = sNoVol.match(/\b(?:\d{2,4}%?|\d+%|la|lite|pro|plus|forte)\b/gi) || [];
  return new Set(matches.map(m => m.toLowerCase().trim()));
}

function parseComboComponents(compStr) {
  if (!compStr || typeof compStr !== 'string') return [];
  const parts = compStr.split(/[+&,;]|\bvà\b/i);
  const res = [];
  for (let p of parts) {
    p = p.trim();
    if (!p) continue;
    const m = p.match(/^(\d+)\s*(?:x|chai|gói|hộp|lọ|túi|can|viên|vỉ|bịch)?\s*[:\-\s]?\s*(.+)$/i);
    let qty = 1;
    let name = p;
    if (m && m[1] && m[2]) {
      qty = parseInt(m[1], 10) || 1;
      name = m[2].trim();
    } else {
      const mTrail = p.match(/^(.+?)\s*(?:x|\*|\()\s*(\d+)\s*\)?$/i);
      if (mTrail && mTrail[1] && mTrail[2]) {
        name = mTrail[1].trim();
        qty = parseInt(mTrail[2], 10) || 1;
      }
    }
    let sku = '';
    const mParen = name.match(/\(([^)]+)\)/);
    if (mParen) {
      sku = mParen[1].trim();
      name = name.replace(/\(([^)]+)\)/, '').trim();
    } else {
      const mVol = name.match(/(\d+\s*(?:ml|g|gam|kg|l|lit|lít|can|chai|gói|hộp|lọ|túi|vỉ|tr\s*ui|triệu\s*(?:ui|iu)))\b/i);
      if (mVol) {
        sku = mVol[1].trim();
        name = name.replace(mVol[0], '').replace(/\s+/g, ' ').trim();
      }
    }
    if (/\bvitamino\s+lite\b/i.test(name)) {
      name = 'NAVET-VITAMINO LITE';
    } else if (/\bvitamino\b/i.test(name)) {
      name = 'NAVET-VITAMINO';
    }
    if (/\b(?:navet[- ]?)?bioglucan\b/i.test(name)) {
      name = 'NAVET-BIOGLUCAN';
    }
    if (/\b(?:navet[- ]?)?betazyme\b/i.test(name)) {
      name = 'NAVET BETAZYME';
    }
    res.push({ name, qty, sku: sku || 'Mặc định' });
  }
  return res;
}

function findMatchingTargetCandidate(compName, compSku, candidates) {
  if (!candidates || candidates.length === 0) return null;
  const cClean = cleanItemProductName(compName).toLowerCase().replace(/[\-_–—]/g, ' ').replace(/\s+/g, ' ').trim();
  const cTokens = new Set(getProductTokens(compName));
  const cDosage = getProductDosageTokens(compName);

  let bestCand = null;
  let bestScore = -1;

  for (const cand of candidates) {
    const candPName = cand.productName || '';
    const candClean = cleanItemProductName(candPName).toLowerCase().replace(/[\-_–—]/g, ' ').replace(/\s+/g, ' ').trim();
    const candDosage = getProductDosageTokens(candPName);

    // Strict distinction: Ampicol (injectable) vs Ampicoli / Ampicoli-C (powder)
    const isCompAmpicoli = /\bampicoli\b/i.test(compName);
    const isCandAmpicoli = /\bampicoli\b/i.test(candPName);
    if (isCompAmpicoli !== isCandAmpicoli && (/\bampicol\b/i.test(compName) || /\bampicol\b/i.test(candPName))) {
      continue;
    }

    // Strict distinction: Butavit vs Butavital
    const isCompButavital = /\bbutavital\b/i.test(compName);
    const isCandButavital = /\bbutavital\b/i.test(candPName);
    if (isCompButavital !== isCandButavital && (/\bbutavit\b/i.test(compName) || /\bbutavit\b/i.test(candPName))) {
      continue;
    }

    // Strict distinction: LITE vs Non-LITE (e.g. Vitamino vs Vitamino LITE, Betazyme vs Betazyme LITE, E-Selen vs E-Selen LITE)
    const isCompLite = /\blite\b/i.test(compName);
    const isCandLite = /\blite\b/i.test(candPName);
    if (isCompLite !== isCandLite) {
      continue;
    }

    // Strict distinction: PLUS vs Non-PLUS (e.g. Amoxicol vs Amoxicol Plus)
    const isCompPlus = /\bplus\b/i.test(compName);
    const isCandPlus = /\bplus\b/i.test(candPName);
    if (isCompPlus !== isCandPlus) {
      continue;
    }

    if (cDosage.size > 0) {
      let conflict = false;
      for (const d of cDosage) {
        if (!candDosage.has(d)) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;
    }

    if (candDosage.size > 0 && cDosage.size === 0) {
      const criticalDosages = ['200', '50%', '100', 'lite', 'plus', 'pro', 'la'];
      let conflict = false;
      for (const cd of criticalDosages) {
        if (candDosage.has(cd)) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;
    }

    let nameScore = 0;
    if (cClean === candClean) {
      nameScore = 100;
    } else if (containsWholeWord(candClean, cClean) || containsWholeWord(cClean, candClean)) {
      nameScore = 85;
    } else if (cTokens.size > 0 && candTokens.size > 0) {
      let matchCount = 0;
      for (const t of cTokens) {
        if (candTokens.has(t)) matchCount++;
      }
      const tokenRatio = matchCount / Math.max(cTokens.size, candTokens.size);
      if (tokenRatio >= 0.5) {
        nameScore = 50 * tokenRatio;
      }
    }

    if (nameScore > bestScore) {
      bestScore = nameScore;
      bestCand = cand;
    }
  }

  return bestScore >= 40 ? bestCand : null;
}

// 1. Candidate list containing only NAVET-VITAMINO LITE
const candLite = {
  productName: 'NAVET-VITAMINO LITE : bổ sung vitamin và acid amin, tăng trọng, vỗ béo, kích thích tăng trưởng cho gia súc, gia cầm',
  sku: 'Gói 1Kg'
};
const candidates = [candLite];

console.log('=== TEST 1: CANDIDATE MATCHING ===');
const match1 = findMatchingTargetCandidate('NAVET-VITAMINO', '1kg', candidates);
console.log('NAVET-VITAMINO vs NAVET-VITAMINO LITE candidate ->', match1 === null ? 'PASS (null, no collision)' : 'FAIL (collided!)');

const match2 = findMatchingTargetCandidate('NAVET-VITAMINO LITE', '1kg', candidates);
console.log('NAVET-VITAMINO LITE vs NAVET-VITAMINO LITE candidate ->', match2 !== null ? 'PASS (matched correctly)' : 'FAIL (not matched!)');

console.log('\n=== TEST 2: COMPONENT PARSING ===');
const p1 = parseComboComponents('1 Navet-BioGlucan (1kg) + 1 Vitamino (1kg)');
console.log('BioGlucan + Vitamino:', p1);

const p2 = parseComboComponents('1 Betazyme (1kg) + 1 Vitamino (1kg)');
console.log('Betazyme + Vitamino:', p2);

const p3 = parseComboComponents('1 Navet BETAZYME (1kg) + 1 Vitamino LITE (1kg)');
console.log('BETAZYME + Vitamino LITE:', p3);

console.log('\n=== TEST 3: DISAGGREGATION AGGREGATION SIMULATION ===');
const map = new Map();

function addCombo(components, qty, comboName) {
  components.forEach(comp => {
    const compQty = qty * comp.qty;
    const matchCand = findMatchingTargetCandidate(comp.name, comp.sku, candidates);
    const prodCand = matchCand || findMatchingTargetCandidate(comp.name, '', candidates);
    let targetPName = prodCand ? prodCand.productName : comp.name;
    let targetSku = matchCand ? matchCand.sku : (comp.sku || 'Mặc định');
    if (!matchCand && comp.sku) {
      const sLow = comp.sku.toLowerCase();
      if (/^\d+\s*(?:g|kg)$/i.test(sLow)) targetSku = `Gói ${comp.sku}`;
    }
    const key = `${targetPName}|||${targetSku}|||-`;
    if (!map.has(key)) {
      map.set(key, { productName: targetPName, sku: targetSku, totalQty: 0, comboAdditions: [] });
    }
    const rec = map.get(key);
    rec.totalQty += compQty;
    rec.comboAdditions.push({ title: comboName, qty: compQty });
  });
}

// 3 orders of SẢN PHẨM VỖ BÉO
addCombo(p1, 3, 'SẢN PHẨM VỖ BÉO + Navet-BioGlucan + Vitamino');
// 3 orders of Vỗ Béo B
addCombo(p2, 3, 'Vỗ Béo B (Betazyme + Vitamino)');
// 7 orders of VỖ BÉO LITE
addCombo(p3, 7, 'VỖ BÉO LITE + Navet BETAZYME + Vitamino LITE');

console.log('Simulation Results:');
for (const [k, v] of map.entries()) {
  console.log(`- Product: [${v.productName}] | SKU: [${v.sku}] | Total Qty: [${v.totalQty}]`);
  v.comboAdditions.forEach(ca => console.log(`   + Đã gồm +${ca.qty} từ: ${ca.title}`));
}

// Assertions
let hasError = false;
let vitRegular = null;
let vitLite = null;

for (const [k, v] of map.entries()) {
  if (v.productName === 'NAVET-VITAMINO') vitRegular = v;
  if (v.productName.includes('NAVET-VITAMINO LITE')) vitLite = v;
}

if (!vitRegular || vitRegular.totalQty !== 6) {
  console.error('FAIL: NAVET-VITAMINO regular should have totalQty = 6, got:', vitRegular ? vitRegular.totalQty : 'null');
  hasError = true;
}
if (!vitLite || vitLite.totalQty !== 7) {
  console.error('FAIL: NAVET-VITAMINO LITE should have totalQty = 7, got:', vitLite ? vitLite.totalQty : 'null');
  hasError = true;
}

if (!hasError) {
  console.log('\n>>> ALL VITAMINO LITE ISOLATION TESTS PASSED! <<<');
} else {
  console.error('\n>>> TEST FAILED! <<<');
  process.exit(1);
}
