# BankBI Data Reference

This directory contains database procedures, sample data, and schema documentation
used by the BankBI analytics platform.

## Directory Structure

```
data/
├── sql/
│   ├── get_tran_summary_procedure.sql   # Main PostgreSQL stored procedure
│   └── call_examples.sql                # Example procedure calls with parameters
├── samples/
│   └── tran_summary_sample.csv          # Sample transaction data (~100 rows)
└── README.md
```

## Source Tables

### `tran_summary` (Primary Fact Table)

| Column | Type | Description |
|--------|------|-------------|
| `acct_num` | string | Account number |
| `cif_id` | string | Customer identification |
| `acct_name` | string | Account holder name |
| `gam_solid` | integer | Branch SOLID code |
| `gam_branch` | string | Branch name |
| `gam_province` | string | Province (1-7 Nepal provinces) |
| `gam_cluster_id` | integer | Cluster ID |
| `gam_cluster` | string | Cluster name |
| `tran_date` | date | Transaction date |
| `tran_type` | string | Transaction type (J=Journal) |
| `part_tran_type` | string | CR=Credit, DR=Debit |
| `tran_amt` | decimal | Transaction amount (NPR) |
| `tran_count` | integer | Number of transactions |
| `eod_balance` | decimal | End-of-day balance |
| `signed_tranamt` | decimal | Signed amount (negative for DR) |
| `tran_source` | string | Channel (mobile, internet, etc.) |
| `merchant` | string | Merchant name |
| `service` | string | Service category |
| `product` | string | Product category |

### `eab` (End-of-day Account Balance)

| Column | Type | Description |
|--------|------|-------------|
| `acid` | string | Account ID |
| `acct_num` | string | Account number |
| `balance_date` | date | Balance date |
| `eod_balance` | decimal | End-of-day balance |
| `currency` | string | Currency code |

## Stored Procedure: `get_tran_summary`

A dynamic SQL procedure that builds multi-period comparison queries.
Accepts 20 parameters including SELECT clauses, WHERE conditions for
10 comparison periods, GROUP BY, HAVING, ORDER BY, pagination, and
optional EAB join.

See `sql/call_examples.sql` for usage patterns.

## Sample Data Notes

- Date range: 2021-02-18 to 2021-07-01
- Most `merchant`, `service`, `product`, `tran_source` fields are NULL
- Province values use generic labels ("province 1" through "province 5")
- Branch/customer names are anonymized ("branch 9", "cust-41780")
- Suitable for development and testing only
