<script>
  import { base } from '$app/paths';
</script>


<main>
<h1>Part B: Encoding Many Hypothetical Updates Efficiently</h1>

<p>
In Part A, we learned how <strong>bit-packed masks</strong> let us evaluate up to 64 hypothetical updates in parallel. But real-world scenarios often involve hundreds or thousands of interventions. 
A straightforward approach — storing a boolean column per update — quickly becomes infeasible.
</p>

<p>
Here, <strong>sparse encoding</strong> comes to the rescue. It exploits structure in common update predicates to drastically reduce memory and computation costs.
</p>

<hr/>

<h2>From Dense Boolean Matrices to Sparse Codes</h2>

<p>
Consider hypothetical updates of the form:
</p>
<ul>
  <li><code>v = ?</code> (equality predicates)</li>
  <li><code>v ≤ ?</code> (range predicates)</li>
</ul>

<p>
In a dense boolean matrix, each distinct value of <code>?</code> would require a separate column.
But for equality predicates, each row belongs to exactly one value.
Instead of storing <em>n</em> booleans per row, we can store a single integer code:
</p>

<pre><code>
row.code ∈ &#123;0, …, n−1&#125;
</code></pre>

<p>
An intervention <code>k</code> then corresponds to removing rows where <code>row.code = k</code>.
This turns a dense target matrix into a <strong>dictionary-encoded sparse representation</strong>.
</p>

<hr/>

<h2>Visual: Dense vs Sparse Encoding</h2>

<svg width="520" height="200" viewBox="0 0 520 200"
     xmlns="http://www.w3.org/2000/svg" style="margin: 1em 0;">
  <style>
    text { font-family: monospace; font-size: 12px; }
    .title { font-weight: bold; }
    .box { fill: none; stroke: #333; }
  </style>

  <!-- Dense -->
  <text x="20" y="20" class="title">Dense Boolean Matrix</text>
  <rect x="20" y="30" width="220" height="120" class="box"/>
  <text x="30" y="55">row × updates</text>
  <text x="30" y="75">1 0 0</text>
  <text x="30" y="95">0 1 0</text>
  <text x="30" y="115">0 0 1</text>

  <!-- Arrow -->
  <text x="255" y="95">⇒</text>

  <!-- Sparse -->
  <text x="300" y="20" class="title">Sparse Encoding</text>
  <rect x="300" y="30" width="180" height="120" class="box"/>
  <text x="310" y="55">row → code</text>
  <text x="310" y="75">1 → 0</text>
  <text x="310" y="95">2 → 0</text>
  <text x="310" y="115">3 → 1</text>
</svg>


<h3>Concrete Example: Customer and Orders</h3>

<p>
Suppose we want to test a hypothetical update: <strong>remove all orders for Hannah (cid=1)</strong>.  
A dense matrix would have a separate column for each intervention, mostly zeros.  
With sparse codes, we can assign:
</p>

<pre><code>
row.code → 0 (Hannah), 1 (Alex), 2 (Maya)
</code></pre>

  <p>Suppose we have the following orders and want to encode them by <code>sensitivity</code>:</p>

  <pre><code class="language-sql">
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
  </code></pre>

  <p>Now, to evaluate a hypothetical update like “remove all sensitive orders”:</p>

  <pre><code class="language-sql">
SELECT
    output_id, code,
    COUNT() AS cnt,
FROM orders_code o
JOIN lineage_edges b ON o.rowid = b.orders_iid
GROUP BY output_id, code;
  </code></pre>

  <p>
    Each output row aggregates only the contributions of rows that satisfy the predicate.
    The <code>row.code</code> encoding replaces a full boolean matrix and allows <strong>linear-time evaluation</strong> across all interventions.
  </p>

<h3>Range Predicates and Prefix Sums</h3>

<p>
For range predicates like <code>order.value ≤ k</code>, each row contributes to all updates whose threshold exceeds its value. Instead of expanding a dense boolean matrix, we can compute a <strong>prefix sum</strong> over sorted row codes.
</p>

<p>
Conceptually:
</p>

<pre><code>result(out, k) = total(out) − Σ rows with value ≤ k</code></pre>

<p>
In SQL, this can be implemented using a window function:
</p>

<pre><code class="language-sql">
WITH agg AS (
    SELECT
        e.output_id, o.value as x, sum(1) as v as total
    FROM lineage_edges as e JOIN orders as o ON (e.orders_iid=o.rowid)
    GROUP BY output_id, x
)
SELECT
    output_id, x,
    total - SUM(v) OVER (
        PARTITION BY output_id
        ORDER BY x
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS remaining_rows
FROM agg
ORDER BY output_id, x;
</code></pre>

<p>
Here, <code>SUM(1) OVER ...</code> acts as a prefix sum over the sparse codes, computing efficiently which rows remain under each threshold <code>x</code>.
This mirrors the bitwise evaluation of multiple what-ifs from Part A.
</p>

<h3>Combining Equality and Range Predicates</h3>

<p>
More complex updates, e.g., <code>v = x AND w ≤ y</code>, can be handled by:
</p>
<ol>
  <li>Partitioning rows by equality attributes</li>
  <li>Applying a prefix sum over the range attribute within each partition</li>
</ol>

<p>
This allows us to compute a two-dimensional space of updates without materializing a quadratic matrix.
</p>

<h2>Why This Matters</h2>

<ul>
  <li><strong>Scalability:</strong> reduces evaluation from O(|rows| × |updates|) to O(|rows|)</li>
  <li><strong>Memory efficiency:</strong> replaces dense boolean matrices with compact integer codes</li>
  <li><strong>SQL-native:</strong> implemented using grouping and window functions</li>
  <li><strong>Composable:</strong> integrates cleanly with lineage-based recomputation</li>
</ul>

<p>
Sparse encodings align naturally with <strong>explanation engines</strong> and <strong>counterfactual search</strong>.  
Each intervention is a partition of the data, and aggregates can be computed efficiently over codes, even when testing thousands of hypothetical updates.
</p>

<p>
The following uses these concepts  <a href="https://haneensa.github.io/whatif-demo/" target="_blank">DEMO</a>
We reimplement of <a href="http://sirrice.github.io/files/papers/scorpion-vldb13.pdf" target="_blank">Scorpion</a>
explanation engine using this approach to evaluate hypothetical updates.
Given a selected set of outlier points and a set of points that align with user expectations,
the engine explores a space of predicates and identifies the most influential ones explaining the outliers.
In this demo, it considers predicates of the form (attr = ?) and (attr v ≤ ?) over voltage, sensor ID, light, and humidity, as well as their combinations.
Concretely, it finds predicates such that removing the tuples matching them causes the outliers to disappear.
</p>


<h2 class="mt-4 mb-3">Follow-ups</h2>
<ul>
  <li><a class="link-primary" href="{base}/part-a">What-ifs? How to evaluate many provenance polynomials fast</a></li>
  <li><a class="link-primary" href="{base}/part-c">Lineage as a DuckDB Extension</a></li>
  <li><a class="link-primary" href="{base}">← Back to main post</a></li>
</ul>

</main>

