# Modeling Bidirectional Customer-Supplier Relationships

To clearly express bidirectional customer-supplier relationships in your SQL database, the best practice is to create a junction table (also known as an association or linking table) that can record both roles explicitly and independently, even if they are reciprocal.

## ✅ Step-by-Step Solution

### 1. companies Table

This stores company info.

```sql
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);
```

### 2. relationships Table (Junction Table)

This table represents the direction of the relationship:
*   `customer_id`: the company initiating the request (playing the customer role)
*   `supplier_id`: the company being asked to supply (playing the supplier role)
*   `status`: pending, accepted, rejected, etc.
*   `created_at`, etc., as needed

```sql
CREATE TABLE relationships (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES companies(id),
    supplier_id INT NOT NULL REFERENCES companies(id),
    status TEXT DEFAULT 'pending',
    UNIQUE (customer_id, supplier_id)  -- prevents duplicate direction
);
```

## 🔁 Example Use Case

Let’s say:
*   Company A (id = 1) invites Company B (id = 2) to be a supplier:

```sql
INSERT INTO relationships (customer_id, supplier_id) VALUES (1, 2);
```

Then later:
*   Company B (id = 2) invites Company A (id = 1) to be a supplier:

```sql
INSERT INTO relationships (customer_id, supplier_id) VALUES (2, 1);
```

Now the database holds two independent relationships:
*   A → B (A is customer, B is supplier)
*   B → A (B is customer, A is supplier)

## ✅ Benefits
*   Handles bidirectional relationships.
*   Lets each party manage the relationship independently (e.g., each can set its own status).
*   Scales well to additional metadata: contract terms, timestamps, access control, etc.

## 🧠 Optional Enhancements
*   Add `initiated_by_user_id` for auditing.
*   Add `relationship_type` if you ever support relationships beyond customer-supplier.
*   Consider adding triggers or views to detect and manage mutual relationships (e.g., show “mutual” if both A→B and B→A exist).