import{f as g,a as m}from"../chunks/Kp7sLg-y.js";import"../chunks/CpO_WCtV.js";import{t as w,s,h as e,i as t}from"../chunks/DxiQdkCR.js";import{s as i}from"../chunks/DvSqlD5E.js";import{b as n}from"../chunks/BqpTCtL9.js";var x=g(`<main><h1>Part B: Encoding Many Hypothetical Updates Efficiently</h1> <p>In Part A, we learned how <strong>bit-packed masks</strong> let us evaluate up to 64 hypothetical updates in parallel. But real-world scenarios often involve hundreds or thousands of interventions. 
A straightforward approach — storing a boolean column per update — quickly becomes infeasible.</p> <p>Here, <strong>sparse encoding</strong> comes to the rescue. It exploits structure in common update predicates to drastically reduce memory and computation costs.</p> <hr/> <h2>From Dense Boolean Matrices to Sparse Codes</h2> <p>Consider hypothetical updates of the form:</p> <ul><li><code>v = ?</code> (equality predicates)</li> <li><code>v ≤ ?</code> (range predicates)</li></ul> <p>In a dense boolean matrix, each distinct value of <code>?</code> would require a separate column.
But for equality predicates, each row belongs to exactly one value.
Instead of storing <em>n</em> booleans per row, we can store a single integer code:</p> <pre><code>
row.code ∈ &#123;0, …, n−1&#125;
</code></pre> <p>An intervention <code>k</code> then corresponds to removing rows where <code>row.code = k</code>.
This turns a dense target matrix into a <strong>dictionary-encoded sparse representation</strong>.</p> <hr/> <h3>Concrete Example: Customer and Orders</h3> <p>Suppose we want to test a hypothetical update: <strong>remove all orders for Hannah (cid=1)</strong>.  
A dense matrix would have a separate column for each intervention, mostly zeros.  
With sparse codes, we can assign:</p> <pre><code>
row.code → 0 (Hannah), 1 (Alex), 2 (Maya)
</code></pre> <p>Suppose we have the following orders and want to encode them by <code>sensitivity</code>:</p> <pre><code class="language-sql">
-- Assign integer codes for equality predicate
CREATE TABLE orders_code AS
SELECT
    rowid,
    CASE
        WHEN sensitivity = 'unclassified' THEN 0
        WHEN sensitivity = 'sensitive'   THEN 1
        WHEN sensitivity = 'top_secret'  THEN 2
    END AS code
FROM orders;
  </code></pre> <p>Now, to evaluate a hypothetical update like “remove all sensitive orders”:</p> <pre><code class="language-sql">
SELECT
    customer_id,
    SUM(value) AS hypothetical_total
FROM orders_code o
JOIN lineage_edges b ON o.rowid = b.orders_iid
WHERE code != 1  -- remove rows with code = 1 (sensitive)
GROUP BY customer_id;
  </code></pre> <p>Each output row (customer) aggregates only the contributions of rows that satisfy the predicate.
    The <code>row.code</code> encoding replaces a full boolean matrix and allows <strong>linear-time evaluation</strong> across all interventions.</p> <p>Evaluating this intervention reduces to summing the contribution of rows where <code>code = 0</code>.</p> <h3>Range Predicates and Prefix Sums</h3> <p>For range predicates like <code>order.value ≤ k</code>, each row contributes to all updates whose threshold exceeds its value. Instead of expanding a dense boolean matrix, we can compute a <strong>prefix sum</strong> over sorted row codes.</p> <p>Conceptually:</p> <pre><code>
result(out, k) = total(out) − Σ rows with value ≤ k
</code></pre> <p>In SQL, this can be implemented using a window function:</p> <pre><code class="language-sql">
WITH agg AS (
    SELECT
        o.cid AS customer,
        o.value,
        row_number() OVER (PARTITION BY o.cid ORDER BY o.value) AS rk,
        COUNT(*) OVER (PARTITION BY o.cid) AS total
    FROM orders o
)
SELECT
    customer,
    rk,
    total - SUM(1) OVER (
        PARTITION BY customer
        ORDER BY rk
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS remaining_rows
FROM agg;
</code></pre> <p>Here, <code>SUM(1) OVER ...</code> acts as a prefix sum over the sparse codes, computing efficiently which rows remain under each threshold <code>rk</code>. This mirrors the bitwise evaluation of multiple what-ifs from Part A.</p> <h3>Combining Equality and Range Predicates</h3> <p>More complex updates, e.g., <code>v = x AND w ≤ y</code>, can be handled by:</p> <ol><li>Partitioning rows by equality attributes</li> <li>Applying a prefix sum over the range attribute within each partition</li></ol> <p>This allows us to compute a two-dimensional space of updates without materializing a quadratic matrix.</p> <h2>Visual: Dense vs Sparse Encoding</h2> <svg width="520" height="200" viewBox="0 0 520 200" xmlns="http://www.w3.org/2000/svg" style="margin: 1em 0;"><style>text { font-family: monospace; font-size: 12px; }
    .title { font-weight: bold; }
    .box { fill: none; stroke: #333; }</style><text x="20" y="20" class="title">Dense Boolean Matrix</text><rect x="20" y="30" width="220" height="120" class="box"></rect><text x="30" y="55">row × updates</text><text x="30" y="75">1 0 0</text><text x="30" y="95">0 1 0</text><text x="30" y="115">0 0 1</text><text x="255" y="95">⇒</text><text x="300" y="20" class="title">Sparse Encoding</text><rect x="300" y="30" width="180" height="120" class="box"></rect><text x="310" y="55">row → code</text><text x="310" y="75">1 → 0</text><text x="310" y="95">2 → 0</text><text x="310" y="115">3 → 1</text></svg> <h2>Why This Matters</h2> <ul><li><strong>Scalability:</strong> reduces evaluation from O(|rows| × |updates|) to O(|rows|)</li> <li><strong>Memory efficiency:</strong> replaces dense boolean matrices with compact integer codes</li> <li><strong>SQL-native:</strong> implemented using grouping and window functions</li> <li><strong>Composable:</strong> integrates cleanly with lineage-based recomputation</li></ul> <p>Sparse encodings align naturally with <strong>explanation engines</strong> and <strong>counterfactual search</strong>.  
Each intervention is a partition of the data, and aggregates can be computed efficiently over codes, even when testing thousands of hypothetical updates.</p> <h2 class="mt-4 mb-3">Follow-ups</h2> <ul><li><a class="link-primary">What-ifs? How to evaluate many provenance polynomials fast</a></li> <li><a class="link-primary">Lineage as a DuckDB Extension</a></li> <li><a class="link-primary">← Back to main post</a></li></ul></main>`);function S(d){var o=x(),l=s(e(o),74),a=e(l),p=e(a);t(a);var r=s(a,2),u=e(r);t(r);var c=s(r,2),h=e(c);t(c),t(l),t(o),w(()=>{i(p,"href",`${n??""}/part-a`),i(u,"href",`${n??""}/part-c`),i(h,"href",n)}),m(d,o)}export{S as component};
