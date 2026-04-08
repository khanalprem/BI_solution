---
name: nepal-banking-domain
description: Nepal banking domain conventions for BankBI. Production data labels, NPR formatting, fiscal-year logic, province mapping, and banking terminology from the live nifi database.
---

# Nepal Banking Domain

Use this skill when adding metrics, labels, filters, or geography that are shown to Nepal banking users.

## Currency and Formatting

- All amounts in **NPR (Nepalese Rupee)**
- Use `frontend/lib/formatters.ts#formatNPR` for all display formatting
- Format: `Rs.` prefix, Indian numbering (lakh/crore): `Rs. 128.6Cr`, `Rs. 45.2L`
- Raw numbers from API — never format in backend

```typescript
formatNPR(12862261100)   // → "Rs. 128.62Cr"
formatNPR(45200000)      // → "Rs. 45.20L"
formatNPR(95000)         // → "Rs. 95,000"
```

---

## Production Province Data

The production `nifi` database uses **numeric province labels** — not Nepal's official province names.

| DB Value | Nepal Province |
|----------|---------------|
| province 1 | Koshi |
| province 2 | Madhesh |
| province 3 | Bagmati |
| province 4 | Gandaki |
| province 5 | Lumbini |
| province 6 | Karnali |
| province 7 | Sudurpashchim |

**Map SVG province IDs** (used in executive dashboard):

| SVG id | DB value |
|--------|----------|
| sudurpashchim | province 7 |
| karnali | province 6 |
| lumbini | province 5 |
| gandaki | province 4 |
| bagmati | province 3 |
| madhesh | province 2 |
| koshi | province 1 |

**Mapping in code:**
```typescript
const PROVINCE_MAP: Record<string, string> = {
  'province 1': 'koshi',
  'province 2': 'madhesh',
  'province 3': 'bagmati',
  'province 4': 'gandaki',
  'province 5': 'lumbini',
  'province 6': 'karnali',
  'province 7': 'sudurpashchim',
};
```

---

## Nepal Fiscal Year

Nepal's fiscal year runs **mid-July to mid-July** (Nepali calendar: Shrawan to Ashadh).

```typescript
// From formatters.ts
case 'FY':
  const fiscalYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  startDate = `${fiscalYear}-07-16`;  // approx mid-July
```

---

## Transaction Types (from production data)

- `tran_type`: only `J` (Journal) in production data
- `part_tran_type`: `CR` (Credit/inflow) or `DR` (Debit/outflow)
- `tran_source`: `"mobile"`, `"internet"`, or `NULL` (branch/counter)

**Display mapping for channels:**
```typescript
const channelLabel = (source: string | null) =>
  source === 'mobile'   ? 'Mobile Banking' :
  source === 'internet' ? 'Internet Banking' :
  'Branch / Counter';
```

---

## Banking Terminology

| Term | Meaning in this data |
|------|---------------------|
| SOL ID (`sol_id`) | Service Outlet — unique branch identifier |
| ACID (`acid`) | Internal account identifier in CBS |
| CIF ID (`cif_id`) | Customer Information File — unique customer ID |
| GAM | General Account Master — full account details |
| HTD | Historical Transaction Detail — raw ledger |
| GSH | GL Sub-Head — chart of accounts hierarchy |
| EAB | End-of-Day Account Balance |
| CR / DR | Credit (inflow) / Debit (outflow) |
| tran_amt | Transaction amount in NPR |
| tran_count | Number of transactions aggregated in this row |
| part_tran_type | Leg type in a double-entry transaction |

---

## NRB Regulatory Context

- NRB = Nepal Rastra Bank (central bank regulator)
- Class A bank minimum CAR: 11%
- NPL threshold: <3% considered acceptable
- Cost-to-Income threshold: <55% considered healthy
- LCR (Basel III): minimum 100%
- Fiscal year: mid-July to mid-July
- Timezone: Asia/Kathmandu (NPT, UTC+5:45)

---

## Data Scope (Production)

- Date range: 2021-02-18 → 2024-07-01
- 164,000 transaction summary rows
- 50,000 unique accounts
- 50,000 unique customers
- Branches: ~60 active (named "branch 1" … "branch 60+")
- Provinces: 7 (numeric labels "province 1"–"province 7")
