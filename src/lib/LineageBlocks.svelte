<script>
  export let customerTable; // receive as prop
  export let ordersTable;

  const prov_sql = `WITH Q1_w_lineage AS (
SELECT row_number() OVER () AS rowid,
       c.name, sum(o.value),
       LIST(c.rowid) as cust_iids,
       LIST(o.rowid) as orders_iids
FROM customer c JOIN orders o USING (cid)
GROUP BY c.name
), lineage_edges AS (
SELECT rowid, UNNEST(cust_iids) customer_iid, UNNEST(orders_iids) orders_iid
FROM Q1_w_lineage
)
SELECT * FROM lineage_edges;`
const formula_sql = `
SELECT
    rowid,
    STRING_AGG('c' || customer_iid || '*o' || orders_iid, ' + ') AS polynomial
FROM lineage_edges
GROUP BY rowid
`;

  const conf_sql = `
# unclassified < sensitive < top_secret
SELECT b.rowid,
    CASE MAX(
        CASE o.sensitivity
            WHEN 'unclassified' THEN 0
            WHEN 'sensitive'    THEN 1
            WHEN 'top_secret'   THEN 2
        END
    )
    WHEN 0 THEN 'unclassified'
    WHEN 1 THEN 'sensitive'
    WHEN 2 THEN 'top_secret'
    END AS final_sensitivity
FROM lineage_edges AS b JOIN orders AS o  ON o.rowid = b.orders_iid
GROUP BY b.rowid
`;

  // Compute query_w_lineage
  const query_w_lineage = customerTable.map((c, cIndex) => {
    const custRowId = cIndex + 1;
    const linkedOrders = ordersTable
      .map((o, oIndex) => ({ ...o, rowid: oIndex + 1 }))
      .filter(o => o.cid === c.cid);

    return {
      oid: c.cid,
      name: c.name,
      sum_value: linkedOrders.reduce((sum,o)=>sum+o.value,0),
      cust_iids: [custRowId],
      orders_iids: linkedOrders.map(o=>o.rowid)
    };
  });

  // Compute lineage_edges with polynomial term
  const lineage_edges = [];
  query_w_lineage.forEach(q => {
    q.cust_iids.forEach(cRow => {
      q.orders_iids.forEach(oRow => {
        lineage_edges.push({
          oid: q.oid,
          customer_iid: cRow,
          orders_iid: oRow,
          polynomial: `c${cRow}*o${oRow}`
        });
      });
    });
  });
</script>

<h2>Representation 2: SQL and the Relational Model</h2>
<p>
While provenance polynomials give a compact mathematical view of lineage, we also need a way to represent and query this information in practice,
using the tools data engineers and analysts already have.
</p>

<p>
In relational databases, we can encode the lineage graph by tracking, for each output row, which input tuples contributed to it.
The basic approach is:
</p>

<ul>
  <li>Assign a unique <strong>row ID</strong> to each input tuple (for example, using the tuple's position in <code>customer</code> and <code>orders</code> tables).</li>
  <li>For each output row, store the <strong>list of contributing input row IDs</strong>.</li>
  <li>Use <code>UNNEST</code> and <code>JOIN</code> operations to generate a <strong>lineage_edges</strong> table of edges connecting inputs to outputs.</li>
</ul>

<p>For our Q1 example, this can be expressed in SQL as:</p>

<pre><code class="language-sql">{prov_sql}</code></pre>
<table class="table table-bordered table-sm">
  <thead>
    <tr>
      <th>rowid</th>
      <th>customer_iid</th>
      <th>orders_iid</th>
      <!--th>Polynomial Term</th-->
    </tr>
  </thead>
  <tbody>
    {#each lineage_edges as row}
      <tr>
        <td>{row.oid}</td>
        <td>{row.customer_iid}</td>
        <td>{row.orders_iid}</td>
        <!--td><code>{row.polynomial}</code></td-->
      </tr>
    {/each}
  </tbody>
</table>

<p>
This <strong>lineage_edges</strong> represents the same information captured by the provenance polynomials,
but in a concrete relational format: each row corresponds to an <strong>edge in the lineage graph</strong>, connecting an input tuple to an output tuple.
</p>

  
<h4>Reconstructing Provenance Polynomial</h4>
<p>Once we have the lineage edges connecting input tuples to outputs, we can reconstruct the provenance polynomial for each output directly in SQL. Each term in the polynomial corresponds to a pair of input tuples — for example, a customer and an order — that contributed to the output.</p>

<pre><code class="language-sql">{formula_sql}</code></pre>
<p>
Each row in the <code>lineage_edges</code> table connects an input customer (<code>customer_iid</code>) to an input order (<code>orders_iid</code>) for a specific output row (<code>oid</code>). We can reconstruct the provenance polynomial for each output by combining these edges: each term <code>cX*oY</code> represents a <strong>join of a customer and an order</strong> that contributed to the output. Using <code>STRING_AGG(..., ' + ')</code>, we sum all contributing terms, reflecting the <strong>addition in provenance polynomials</strong>.
</p>

<p>For our Q1 example, this produces:</p>

<ul>
  <li><strong>Hannah (rowid=1):</strong> c1*o1 + c1*o2 + c1*o4</li>
  <li><strong>Alex (rowid=2):</strong> c2*o3</li>
  <li><strong>Maya (rowid=3):</strong> c3*o5 + c3*o6</li>
</ul>

<p>This provides a <strong>concrete, queryable representation</strong> of the abstract polynomial, bridging theory and practice while keeping it fully relational.</p>


<h4>Use Case 1: Evaluating Confidentialiy</h4>
<p>We can also use the lineage edges to propagate metadata from inputs to outputs.
For example, consider sensitivity levels (unclassified &rarr; sensitive &rarr; top_secret) on each order. Using the lineage, we can compute the final sensitivity of each output row based on the most sensitive contributing order:</p>
<pre><code class="language-sql">{conf_sql}</code></pre>
<p>This aggregates the sensitivities of all orders contributing to each output.
The MAX ensures that the output row is labeled with the most sensitive input.
This is a practical example of how provenance can be used for data governance, compliance, and risk assessment.</p>


<h4>Use Case 2: What-if Analysis (Hypothetical Updates)</h4>

<p>
Provenance enables <em>what-if</em> reasoning: we can ask how the output would change under
hypothetical updates, without re-running the full query or recomputing lineage.
Instead, we evaluate the existing lineage under new assumptions.
</p>

<p>
Consider the first output row (Hannah), whose provenance polynomial is:
</p>

<p>
<code>
10·c1·o1 + 100·c1·o2 + 30·c1·o4
</code>
</p>

<p>
Each term combines a customer variable, an order variable, and the actual order value.
Suppose we want to recompute this total while <strong>excluding all orders that are not
<code>unclassified</code></strong>.
At the polynomial level, we can model this by assigning:
</p>

<ul>
  <li><code>oX = 1</code> if the order is <code>unclassified</code></li>
  <li><code>oX = 0</code> otherwise</li>
</ul>

<p>
In this example, orders <code>o1</code> and <code>o4</code> are unclassified, while <code>o2</code> is sensitive.
Substituting these values yields:
</p>

<p>
<code>
10·c1·1 + 100·c1·0 + 30·c1·1 = 40
</code>
</p>

<p>
The same idea can be implemented relationally using SQL.
The lineage edges identify exactly which input rows contributed to the output,
allowing us to apply the hypothetical condition at evaluation time:
</p>

<pre><code class="language-sql">
SELECT
  SUM(
    (o.sensitivity = 'unclassified')::INT * o.value
  ) AS hypothetical_total
FROM lineage_edges AS e
JOIN orders AS o
  ON o.rowid = e.orders_iid
WHERE e.rowid = 1;
</code></pre>

<p>
By filtering on sensitivity during evaluation, we simulate deletions or policy changes
and immediately observe their effect on the result—without touching the base tables
or recomputing lineage.
</p>

<h4>Use Case 3: View Maintenance</h4>

<p>
The same <em>what-if</em> mechanism can also be used for view maintenance.
Instead of recomputing a view from scratch when data changes,
lineage tells us exactly which outputs depend on which input tuples.
</p>

<p>
If a base tuple is <strong>deleted</strong>, we can identify all output rows whose
polynomials reference that tuple and update only those results.
Similarly, if a tuple is <strong>updated</strong> or <strong>scaled</strong> (e.g., correcting a value or applying a multiplier),
we can re-evaluate only the affected terms in the polynomial without touching unrelated outputs.
</p>

<p>
Lineage also works the other way: if an <strong>output row is removed or updated</strong>,
we can see which input tuples contributed to it and understand how the change propagates.
</p>

<p>
In essence, provenance polynomials serve as a compact map of dependencies:
they show exactly how base data builds the outputs,
making incremental updates and hypothetical scenarios easy to reason about.
</p>


<h4>What do we get?</h4>

<p>
By representing lineage as an <strong>integer-based index</strong> (the lineage block),
we get several practical benefits:
</p>

<ul>
  <li><strong>Compact and shareable:</strong> we can ship the lineage block to end users without sending the full data.</li>
  <li><strong>Efficient evaluation:</strong> if the original query is expensive, we don’t need to rerun costly joins—just join back the columns needed to answer a question.</li>
  <li><strong>Fast what-if analyses:</strong> we can evaluate many hypothetical updates at once. In fact, under the hood, most explanation engines rely on evaluating numerous hypothetical updates to identify the change that best explains an outlier.</li>
</ul>

<p>
These advantages make provenance not just a tool for debugging or auditing,
but a practical engine for reasoning about data, policies, and transformations.
</p>
