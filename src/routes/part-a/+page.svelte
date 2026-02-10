<script>
  import { getDuckDB } from '$lib/duckdb';
  import { onMount } from 'svelte';

  let count = 0;

  onMount(async () => {
    const conn = await getDuckDB();
    const res = await conn.query("SELECT 1 as cnt");
    count = res.toArray().map((row) => row.toJSON())[0].cnt;
  });
</script>


<div class="card shadow-sm p-4 mb-4">
  <h1>What-ifs? How to evaluate many provenance polynomials fast</h1>
  <a class="link-primary" href="/">← Back to main post</a>
</div>

