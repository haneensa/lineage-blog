<main class="container-fluid">
<h1>Lineage as a DuckDB Extension</h1>

<p>
Manually capturing lineage in SQL quickly becomes cumbersome. For example, to track which input tuples contributed to each output row for a query like Q1, you would have to write something like:
</p>

<pre><code class="language-sql">
WITH Q1_w_lineage AS (
    SELECT row_number() OVER () AS rowid,
           c.name, SUM(o.value),
           LIST(c.rowid) AS cust_iids,
           LIST(o.rowid) AS orders_iids
    FROM customer c
    JOIN orders o USING (cid)
    GROUP BY c.name
), lineage_edges AS (
    SELECT rowid, UNNEST(cust_iids) AS customer_iid,
                 UNNEST(orders_iids) AS orders_iid
    FROM Q1_w_lineage
)
SELECT * FROM lineage_edges;
</code></pre>

<p>
Even for a simple query, the rewrite involves multiple steps: assigning output row IDs, collecting input row lists, and unnesting them into edges.
As queries get more complex—with joins, aggregations, or nested subqueries—this approach quickly becomes error-prone and hard to maintain.
</p>

<p>
The <strong>DuckDB lineage extension</strong> solves this problem by automatically capturing fine-grained lineage at the logical plan level.
It adds annotation columns to track input-to-output dependencies, persists them in memory, and still returns the original query results.
</p>

<p>
Users can enable lineage capture with a single command:
</p>

<pre><code class="language-sql">
LOAD 'lineage.duckdb_extension';
PRAGMA set_lineage(True);

-- execute any query as usual
SELECT c.name, SUM(o.value) AS total_spend
FROM customer c
JOIN orders o USING (cid)
GROUP BY c.name;

PRAGMA set_lineage(False);
</code></pre>

<p>
Once the query finishes, lineage edges are available through a simple table function:
</p>

<pre><code class="language-sql">
SELECT *
FROM lineage_edges(
    (SELECT max(query_id) FROM pragma_latest_qid())
);
</code></pre>

<p>
This approach keeps the user experience simple while capturing full fine-grained lineage, ready for debugging, what-if analysis, or provenance-based computations.
</p>


<a href="/">← Back to main post</a>
</main>
