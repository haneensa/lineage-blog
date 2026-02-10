import{f as h,a as m}from"../chunks/Kp7sLg-y.js";import"../chunks/CpO_WCtV.js";import{t as b,s,h as e,i as a}from"../chunks/DxiQdkCR.js";import{s as n}from"../chunks/DvSqlD5E.js";import{b as r}from"../chunks/BtEvNrji.js";var f=h(`<main><h1>Part A: What-ifs? Evaluating Many Provenance Polynomials Fast</h1> <p>Lineage isn’t just about knowing which inputs produced which outputs—it’s also a powerful tool for <em>what-if analysis</em>.  
Imagine asking: <strong>“What if we removed all sensitive orders?”</strong> or <strong>“What if we scaled certain orders by 2x?”</strong> With fine-grained lineage, we can evaluate these hypothetical updates quickly, without recomputing the full query from scratch.</p> <h2>From Provenance Polynomials to Hypotheticals</h2> <p>Recall our earlier example with <code>customer</code> and <code>orders</code>:</p> <pre><code>
Hannah (oid=1): c1*o1 + c1*o2 + c1*o4  
Alex   (oid=2): c2*o3  
Maya   (oid=3): c3*o5 + c3*o6
</code></pre> <p>Each term <code>cX*oY</code> represents a join of a customer and an order contributing to the output.
Using <strong>provenance polynomials</strong>, we can perform hypothetical updates by <b>assigning different values to these variables</b>. For instance, to exclude all orders that are not <code>unclassified</code> for Hannah: <code>10*c1*o1 + 100*c1*o2 + 30*c1*o4</code></p> <p>We simply set the variables corresponding to orders that don’t satisfy the predicate to <code>0</code>.
This lets us recompute totals <strong>without touching the base tables</strong>.
For example, for customer <code>c1</code> and orders <code>o1, o2, o4</code> contributing to the first output:</p> <ul><li>Original polynomial: <code>c1*o1 + c1*o2 + c1*o4</code></li> <li>Excluding non-unclassified orders: set <code>o2 = 0</code> and otherwise 1  → <code>10*1*1 + 1*0 + 30*1*1=40</code></li></ul> <p>This lets us compute the “what-if” total for the output row without touching the base tables—lineage edges identify exactly which inputs to adjust.</p> <h2>Evaluating Many What-ifs at Once</h2> <h4>Bit-Packed Masks for Multiple What-ifs</h4> <p>When we have many hypothetical updates to test, storing a boolean variable per predicate per row can be inefficient.
Instead, we encode up to 64 boolean predicates in a single 64-bit integer using bit-packing. Each bit represents a predicate for that row:</p> <div style="display:flex; gap:2rem; flex-wrap:wrap; margin-top:1rem;"><div><strong>Customer c1</strong> <div style="display:flex; font-family: monospace;"><span style="padding:2px; background:#d4edda; border:1px solid #28a745;">1</span> <span style="padding:2px; background:#f8d7da; border:1px solid #dc3545;">0</span> <span style="padding:2px; background:#d4edda; border:1px solid #28a745;">1</span> <span style="padding:2px; background:#f8d7da; border:1px solid #dc3545;">0</span> ... up to 64 bits</div> <small>bit 0 = US?, bit 1 = Active?, bit 2 = Premium?, ...</small></div> <div><strong>Order o101</strong> <div style="display:flex; font-family: monospace;"><span style="padding:2px; background:#d4edda; border:1px solid #28a745;">1</span> <span style="padding:2px; background:#f8d7da; border:1px solid #dc3545;">0</span> <span style="padding:2px; background:#d4edda; border:1px solid #28a745;">1</span> <span style="padding:2px; background:#f8d7da; border:1px solid #dc3545;">0</span> ... up to 64 bits</div> <small>bit 0 = unclassified?, bit 1 = shipped?, bit 2 = high value?, ...</small></div></div> <p>Using bitwise operations, we can evaluate up to 64 hypothetical scenarios in parallel: <code>mask & bitstring('1',64)</code> selects rows matching a predicate, allowing efficient computation of many what-ifs simultaneously.</p> <h4>Concrete Example with Customer and Orders</h4> <p>Instead of recomputing queries, we can precompute a <code>target_matrix</code> with bit-packed predicates:</p> <pre><code class="language-sql">
CREATE TABLE orders_tm AS
SELECT
    rowid AS iid,
    set_bit(bitstring('0',64),0,(sensitivity='unclassified')::int) | 
    set_bit(bitstring('0',64),1,(value>50)::int) AS mask_0
FROM orders;
</code></pre> <p>Now we can evaluate multiple what-if scenarios in a single query using lineage edges and bit masks:</p> <pre><code class="language-sql">
SELECT
    b.oid,
    SUM(
        (o.sensitivity = 'unclassified')::INT * o.value
    ) AS hypothetical_total
FROM lineage_edges AS b
JOIN orders AS o
    ON o.rowid = b.orders_iid
WHERE b.oid = 1
GROUP BY b.oid;
</code></pre> <p>The lineage edges ensure only contributing orders are considered.
Multiplying by the boolean predicate effectively sets excluded orders to 0.</p> <h5>Extending to Many Hypotheticals</h5> <p>Each predicate can occupy a bit in a 64-bit column in <code>orders_tm</code>. We can evaluate 64 scenarios in parallel using bitwise operations:</p> <pre><code class="language-sql">
SELECT
    b.oid,
    SUM(
        o.value & bit_get(tm.mask_0, 0)  -- scenario 1
      + o.value & bit_get(tm.mask_0, 1)  -- scenario 2
      + o.value & bit_get(tm.mask_0, 2)  -- scenario 3
    ) AS hypothetical_total
FROM lineage_edges AS b
JOIN orders AS o
    ON o.rowid = b.orders_iid
JOIN orders_tm AS tm
    ON tm.iid = o.rowid
WHERE b.oid = 1
GROUP BY b.oid;
</code></pre> <p>This approach accesses only the columns needed for aggregation.
We can ship just the lineage block and bit-packed masks to the end user,
avoiding full table scans and expensive joins.</p> <h4>What We Get</h4> <ul><li><strong>Efficient evaluation:</strong> 64 scenarios per row can be computed in parallel.</li> <li><strong>Minimal data movement:</strong> only the lineage block and masks are needed.</li> <li><strong>Flexible analysis:</strong> supports aggregates, policy-based filters, and arbitrary hypothetical updates.</li> <li><strong>Required for explanation engines:</strong> under the hood, they evaluate many hypothetical updates to find which change explains an outlier.</li></ul> <h2 class="mt-4 mb-3">Follow-ups</h2> <ul><li><a class="link-primary">What-ifs: Sparse Encoding</a></li> <li><a class="link-primary">Lineage as a DuckDB Extension</a></li> <li><a class="link-primary">← Back to main post</a></li></ul></main>`);function _(c){var i=f(),d=s(e(i),54),o=e(d),p=e(o);a(o);var t=s(o,2),u=e(t);a(t);var l=s(t,2),g=e(l);a(l),a(d),a(i),b(()=>{n(p,"href",`${r??""}/part-b`),n(u,"href",`${r??""}/part-c`),n(g,"href",r)}),m(c,i)}export{_ as component};
