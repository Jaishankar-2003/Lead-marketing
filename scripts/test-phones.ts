import { normalizeIndianPhone, extractPhoneNumbers } from '../src/lib/vendors/phoneUtils';

const testInputs = [
  '4442012131, 9840057413, 9176424415',
  '004-28521607, 9884411731',
  '9500851996 (Parrys), 9994623471 (Chindandripet)',
  '91 8667237343',
  '06360484042',
  '098420 51872, 090956 88491',
  '90473 07722',
  '97873 88111, 9626966866'
];

for (const input of testInputs) {
  const extracted = extractPhoneNumbers(input);
  console.log('INPUT:', input);
  console.log('  EXTRACTED:', extracted);
  for (const p of extracted) {
    const res = normalizeIndianPhone(p);
    console.log('    -> raw:', p, 'normalized:', res.normalized, 'valid:', res.isValid, 'type:', res.type, 'WA:', res.canWhatsApp);
  }
}
