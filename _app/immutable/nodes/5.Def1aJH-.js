import{f as n,a as i}from"../chunks/DnzYIlyJ.js";import"../chunks/RaH3AT36.js";var o=n(`<main class="container-fluid"><h1>Part C: Lineage as a DuckDB Extension</h1> <p>Manually capturing lineage in SQL quickly becomes cumbersome. For example, to track which input tuples contributed to each output row for a query like Q1, you would have to write something like:</p> <pre><code class="language-sql">
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
</code></pre> <p>Even for a simple query, the rewrite involves multiple steps: assigning output row IDs, collecting input row lists, and unnesting them into edges.
As queries get more complex—with joins, aggregations, or nested subqueries—this approach quickly becomes error-prone and hard to maintain.</p> <p>The <strong>DuckDB lineage extension</strong> solves this problem by automatically capturing fine-grained lineage at the logical plan level.
It adds annotation columns to track input-to-output dependencies, persists them in memory, and still returns the original query results.</p> <p>Users can enable lineage capture with a single command:</p> <pre><code class="language-sql">
LOAD 'lineage.duckdb_extension';
PRAGMA set_lineage(True);

-- execute any query as usual
SELECT c.name, SUM(o.value) AS total_spend
FROM customer c
JOIN orders o USING (cid)
GROUP BY c.name;

PRAGMA set_lineage(False);
</code></pre> <p>Once the query finishes, lineage edges are available through a simple table function:</p> <pre><code class="language-sql">
SELECT *
FROM read_block(
    (SELECT max(query_id) FROM pragma_latest_qid())
);
</code></pre> <h4>Downloading and Using the Extension</h4> <p>The DuckDB lineage extension is not yet officially verified, but you can download it directly from GitHub artifacts using the provided script:</p> <pre><code class="language-bash">
# download lineage.duckdb_extension from GitHub artifacts
python3 https://github.com/haneensa/lineage/blob/main/scripts/download_extension.py
</code></pre> <p>To use the extension in DuckDB, make sure to allow unsigned extensions when connecting:</p> <pre><code class="language-python">
import duckdb

# Allow unsigned extensions when connecting
con = duckdb.connect(config=&#123; &nbsp;'allow_unsigned_extensions': True&nbsp; &#125)

# Load the lineage extension
con.execute("LOAD 'lineage';")

# Enable lineage capture
con.execute("PRAGMA set_lineage(True)")

# Execute any query as usual
con.execute("""
    SELECT c.name, SUM(o.value) AS total_spend
    FROM customer c
    JOIN orders o USING (cid)
    GROUP BY c.name
""")

# Disable lineage capture
con.execute("PRAGMA set_lineage(False)")

lineage_edges = con.execute(f"SELECT *
FROM read_block(
    (SELECT max(query_id) FROM pragma_latest_qid())
);").fetchdf()
</code></pre> <p>This setup allows you to capture full fine-grained lineage without rewriting queries or modifying your workflow.</p> <h2 class="mt-4 mb-3">Follow-ups</h2> <ul><li><a class="link-primary" href="part-a">What-ifs? How to evaluate many provenance polynomials fast</a></li> <li><a class="link-primary" href="part-b">What-ifs: Sparse Encoding</a></li> <li><a class="link-primary" href="/">← Back to main post</a></li></ul></main>`);function r(e){var a=o();i(e,a)}export{r as component};
