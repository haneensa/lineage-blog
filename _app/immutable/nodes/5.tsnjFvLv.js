import{f as h,a as m}from"../chunks/Kp7sLg-y.js";import"../chunks/CpO_WCtV.js";import{t as b,s as i,h as e,i as t}from"../chunks/DxiQdkCR.js";import{s as r}from"../chunks/DvSqlD5E.js";import{b as s}from"../chunks/BM43ke9o.js";var f=h(`<main class="container-fluid"><h1>Part C: Lineage as a DuckDB Extension</h1> <p>Manually capturing lineage in SQL quickly becomes cumbersome.
For example, to track which input tuples contributed to each output row for a query like Q1,
you would have to write something like:</p> <pre><code class="language-sql">WITH Q1_w_lineage AS (
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
</code></pre> <p>Even for a simple query, the rewrite involves multiple steps:
signing output row IDs and propagate input row IDs through query execution.
As queries get more complex ( with joins, aggregations, or nested subqueries) this
approach quickly becomes error-prone and hard to maintain.</p> <p>The <strong>DuckDB lineage extension</strong> solves this problem by automatically
applying the rewrite at the logical plan level.
It adds annotation columns to track input-to-output dependencies, persists them in memory,
and returns the original query results.</p> <p>Users can enable lineage capture with a single command: <code>PRAGMA set_lineage(True);</code>, run their unmodified queries, 
then access lineage edges through a simple table function:</p> <pre><code class="language-sql">
SELECT * FROM read_block( (SELECT max(query_id) FROM lineage_meta()) );
  </code></pre> <h4>Downloading and Using the Extension</h4> <p>The DuckDB lineage extension is not yet officially verified, but you can download it directly from GitHub artifacts using the provided script:</p> <pre><code class="language-bash"># download lineage.duckdb_extension from GitHub artifacts
python3 https://github.com/haneensa/lineage/blob/main/scripts/download_extension.py
</code></pre> <p>To use the extension in DuckDB, make sure to allow unsigned extensions when connecting:</p> <pre><code class="language-python">import duckdb

# Allow unsigned extensions when connecting
con = duckdb.connect(config=&#123; &nbsp;'allow_unsigned_extensions': True&nbsp; &#125)

# Load the lineage extension
con.execute("LOAD 'lineage';")

# Enable lineage capture
con.execute("PRAGMA set_lineage(True)")

# Execute query
con.execute("""SELECT c.name, SUM(o.value) AS total_spend
    FROM customer c
    JOIN orders o USING (cid)
    GROUP BY c.name""")

# Disable lineage capture
con.execute("PRAGMA set_lineage(False)")

lineage_edges = con.execute(f"SELECT * FROM read_block(
    (SELECT max(query_id) FROM lineage_meta())
);").fetchdf()
</code></pre> <p>This setup allows you to capture full row lineage without rewriting queries or modifying your workflow.</p> <h2 class="mt-4 mb-3">How the Query Plan is Modified</h2> <p>The lineage extension automatically modifies the query plan at the operator level to propagate annotations efficiently. Each operator only adds the minimal annotation necessary, and complex lineage is stripped before propagating upstream.</p> <ul><li><strong>Leaf operators (table scans)</strong> are modified to include a <code>rowid</code> column, uniquely identifying each input tuple.</li> <li><strong>One-to-one operators</strong> like <code>FILTER</code> and <code>PROJECTION</code> propagate the input annotation column to the output.</li> <li><strong>Join operators</strong> propagate annotations from both children to the output. For semi/anti joins, only the relevant side is propagated.</li> <li><strong>One-to-many operators</strong> like <code>AGGREGATION</code> accumulate input annotations using a <code>LIST()</code> function per output group.</li> <li>After operators producing complex lineage annotations, a <strong>Lineage Operator</strong> is inserted. It strips detailed annotations from the output, leaving a single <code>rowid</code> column for the parent operator.</li></ul> <p>Conceptually, a simple query plan like <code>A ⋈ B → AGG</code> is transformed as follows:</p> <center><pre><code class="language-text">
Original Plan
=============

        Aggregate
            │
           Join
         ┌───┴───┐
     TableScan(A) TableScan(B)



Plan with Lineage Instrumentation
==================================

   LineageOp  (strip LIST(rowid))
            │
        Aggregate  (LIST(rowid))
            │
   LineageOp  (strip A.rowid, B.rowid → add rowid)
            │
        Join  (+A.rowid, +B.rowid)
         ┌───────┴────────┐
TableScan(A) +rowid   TableScan(B) +rowid
</code></pre></center> <p>At each stage, the extension ensures that only the minimal annotation necessary is propagated upstream. The root operator also receives a final Lineage Operator to strip annotations before returning results to the user.</p> <section><h2 class="mt-4 mb-3">From Per-Operator Lineage to an SPJUA Lineage Block</h2> <p>So far, we described how the extension captures lineage after a join or an aggregation.
  But users typically don’t want this level of details,  they want lineage for the <strong>entire SPJUA query</strong>.
  To bridge this gap, the extension <strong>constructs a unified lineage block</strong> by composing the lineage captured.</p> <h3>What Is an SPJUA Lineage Block?</h3> <p>For a query consisting of: <strong>S</strong>elect, <strong>P</strong>roject, <strong>J</strong>oin, <strong>U</strong>nion, <strong>A</strong>ggregate.</p> <p>We construct a lineage block that:</p> <ul><li>Has <strong>one column per base table access</strong></li> <li>Contains an additional column representing the <strong>output tuple id</strong></li> <li>Encodes the mapping: <em>which input tuples contributed to which output tuple</em></li></ul> <center><pre><code class="language-text">
orders_tid | customer_tid | lineitem_tid | output_tid
-----------|--------------|--------------|----------
4          | 2            | 7            | 0
5          | 2            | 8            | 1
...        | ...          | ...          | ...
  </code></pre></center> <p>Each row represents a <em>provenance relationship</em>:</p> <ul><li>Input tuple IDs from base tables</li> <li>The output tuple they contributed to</li></ul> <h3>How the User Accesses It</h3> <p>Once a query finishes, the extension materializes the lineage block internally.  
    Users can retrieve the latest lineage block via:</p> <pre><code class="language-sql">
SELECT * FROM read_block( (SELECT max(query_id) FROM lineage_meta()) );
  </code></pre> <p>This returns a table where:</p> <ul><li>Each column corresponds to a base table accessed by the query</li> <li>An additional column encodes the output tuple id</li> <li>Each row encodes one complete provenance mapping</li></ul> <h3>Why This Matters</h3> <p>Capturing lineage per operator keeps overhead low and integrates naturally with DuckDB’s execution engine.
    Composing them into a <strong>single SPJUA lineage block</strong> provides:
    A clean user-facing abstraction and a compact representation of multi-table dependencies.</p></section> <h3>Development Plan</h3> <p>We plan to extend the DuckDB lineage extension to support all major logical operators and capture full input-to-output mappings per SPJUA block.
Short-circuit optimizations will be disabled to ensure complete lineage, making query provenance fully accessible via <code>read_block()</code>.</p> <h2 class="mt-4 mb-3">Follow-ups</h2> <ul><li><a class="link-primary">What-ifs? How to evaluate many provenance polynomials fast</a></li> <li><a class="link-primary">What-ifs: Sparse Encoding</a></li> <li><a class="link-primary">← Back to main post</a></li></ul></main>`);function A(p){var o=f(),l=i(e(o),46),n=e(l),u=e(n);t(n);var a=i(n,2),d=e(a);t(a);var c=i(a,2),g=e(c);t(c),t(l),t(o),b(()=>{r(u,"href",`${s??""}/part-a`),r(d,"href",`${s??""}/part-b`),r(g,"href",s)}),m(p,o)}export{A as component};
