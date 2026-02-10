<script>
  import ProvPoly from '$lib/ProvPoly.svelte';
  import LineageBlocks from '$lib/LineageBlocks.svelte';
  
  let showPolynomials = false; // toggle to show/hide the polynomial column
  let hoveredCustomer = null;
  let hoveredOrder = null;
  let hoveredOutput = null;


  // Predefined tables
  let customerTable = [
    { rowid: 1, cid: 1, name: 'Hannah', region: 'US' },
    { rowid: 2, cid: 2, name: 'Alex',   region: 'EU' },
    { rowid: 3, cid: 3, name: 'Maya',   region: 'US' },
  ];

  let ordersTable = [
    { rowid: 1, id: 101, cid: 1, order_date: '2024-01-05', value: 10,  sensitivity: 'unclassified' },
    { rowid: 2, id: 102, cid: 1, order_date: '2024-01-12', value: 100, sensitivity: 'sensitive' },
    { rowid: 3, id: 103, cid: 2, order_date: '2024-01-20', value: 20,  sensitivity: 'top_secret' },
    { rowid: 4, id: 104, cid: 1, order_date: '2024-02-01', value: 30,  sensitivity: 'unclassified' },
    { rowid: 5, id: 105, cid: 3, order_date: '2024-02-05', value: 50,  sensitivity: 'unclassified' },
    { rowid: 6, id: 106, cid: 3, order_date: '2024-02-10', value: 70,  sensitivity: 'unclassified' },
  ];

  // Generate SQL insert statements from arrays
  const customerInsertSQL = customerTable
    .map(c => `(${c.cid}, '${c.name}', '${c.region}')`)
    .join(',\n  ');

  const ordersInsertSQL = ordersTable
    .map(o => `(${o.id}, ${o.cid}, DATE '${o.order_date}', ${o.value}, '${o.sensitivity}')`)
    .join(',\n  ');

   // Generate SQL code for each table
  const customerCode = `CREATE TABLE customer (cid INT PRIMARY KEY, name VARCHAR, region VARCHAR);
INSERT INTO customer VALUES
  ${customerTable.map(c => `(${c.cid}, '${c.name}', '${c.region}')`).join(',\n  ')};
`;

  const ordersCode = `CREATE TABLE orders (id INT PRIMARY KEY, cid INT, order_date DATE, value INT, sensitivity VARCHAR);
INSERT INTO orders VALUES
  ${ordersTable.map(o => `(${o.id}, ${o.cid}, DATE '${o.order_date}', ${o.value}, '${o.sensitivity}')`).join(',\n  ')};
`;
  const aggQuery = `SELECT c.name, SUM(o.value) AS total_spend
FROM customer c JOIN orders o USING (cid)
GROUP BY c.name`;

    // Compute aggregated output with polynomial
  const outputsTable = customerTable.map(c => {
    const orders = ordersTable.filter(o => o.cid === c.cid);
    const ordersIds = orders.map(o => o.id);

    // Construct polynomial: c{cid}*o{id} + ...
    const polynomial = orders.map(o => `${o.value}*c${c.rowid}*o${o.rowid}`).join(' + ');

    // Return row object
    return {
      oid: c.cid,
      name: c.name,
      region: c.region,
      orders: ordersIds,
      polynomial
    };
  });
  // Helpers for bidirectional highlighting

  // Customer is highlighted if:
  // - hovered directly, OR
  // - any of its orders are hovered, OR
  // - it contributed to hovered output
  function isCustomerHighlighted(c) {
    if (hoveredCustomer === c.cid) return true;
    if (hoveredOrder && ordersTable.some(o => o.id === hoveredOrder && o.cid === c.cid)) return true;
    if (hoveredOutput && hoveredOutput.orders.some(oId => ordersTable.find(o=>o.id===oId).cid === c.cid)) return true;
    return false;
  }

  // Order is highlighted if:
  // - hovered directly, OR
  // - its customer is hovered, OR
  // - it is part of hovered output
  function isOrderHighlighted(o) {
    if (hoveredOrder === o.id) return true;
    if (hoveredCustomer === o.cid) return true;
    if (hoveredOutput && hoveredOutput.orders.includes(o.id)) return true;
    return false;
  }

  // Output row is highlighted if:
  // - hovered directly, OR
  // - any of its input customer or orders are hovered
  function isOutputHighlighted(out) {
    if (hoveredOutput && hoveredOutput.oid === out.oid) return true;
    if (hoveredCustomer && ordersTable.some(o => out.orders.includes(o.id) && o.cid === hoveredCustomer)) return true;
    if (hoveredOrder && out.orders.includes(hoveredOrder)) return true;
    return false;
  }
</script>

<style>
  pre { background: #f5f5f5; padding: 1em; overflow-x: auto; }
  .sql-columns { display: flex; gap: 1rem; flex-wrap: wrap; }
  .sql-column { flex: 1; min-width: 300px; }
</style>

<div class="sql-columns">
  <div class="sql-column">
    <h4>Customer Table</h4>
    <pre><code class="language-sql">{customerCode}</code></pre>
  </div>

  <div class="sql-column">
    <h4>Orders Table</h4>
    <pre><code class="language-sql">{ordersCode}</code></pre>
  </div>
</div>

<div class="row g-4">
  <!-- Customers Table -->
  <div class="col-md-6">
    <h4>Customers</h4>
    <table class="table table-striped table-bordered table-sm">
      <thead>
        <tr>
          {#if showPolynomials}<th>rowid</th>{/if}
            <th>cid</th><th>name</th><th>region</th>
            {#if showPolynomials}<th>Provenance</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each customerTable as c}
          <tr
            on:mouseenter={() => hoveredCustomer = c.cid}
            on:mouseleave={() => hoveredCustomer = null}
            class:table-info={isCustomerHighlighted(c)}
          >
          {#if showPolynomials}<td>{c.rowid}</td>{/if}
            <td>{c.cid}</td>
            <td>{c.name}</td>
            <td>{c.region}</td>
            {#if showPolynomials}
              <td><code>c{c.rowid}</code></td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Orders Table -->
  <div class="col-md-6">
    <h4>Orders</h4>
    <table class="table table-striped table-bordered table-sm">
      <thead>
        <tr>
          {#if showPolynomials}<th>rowid</th>{/if}
          <th>id</th>
          <th>cid</th>
          <th>order_date</th>
          <th>value</th>
          <th>sensitivity</th>
          {#if showPolynomials}<th>Provenance</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each ordersTable as o}
          <tr
            on:mouseenter={() => hoveredOrder = o.id}
            on:mouseleave={() => hoveredOrder = null}
            class:table-warning={isOrderHighlighted(o)}
          >
            {#if showPolynomials}<td>{o.rowid}</td>{/if}
            <td>{o.id}</td>
            <td>{o.cid}</td>
            <td>{o.order_date}</td>
            <td>{o.value}</td>
            <td>{o.sensitivity}</td>
            {#if showPolynomials}
              <td><code>o{o.rowid}</code></td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<!-- Aggregated Output -->
<div class="row g-4 mt-3">
  <div class="col-12">
    Now, let’s compute the total order value per customer with a simple SQL aggregation:
    <pre><code class="language-sql">Q1='{aggQuery}'</code></pre>

    <h4>Q1's output</h4>
    <table class="table table-striped table-bordered table-sm">
      <thead>
        <tr>
      {#if showPolynomials}<th>rowid</th>{/if}
          <th>name</th><th>total_spend</th>
      {#if showPolynomials}<th>Provenance</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each outputsTable as out}
          <tr
            on:mouseenter={() => hoveredOutput = out}
            on:mouseleave={() => hoveredOutput = null}
            class:table-success={isOutputHighlighted(out)}
            style="cursor:pointer;"
          >
            {#if showPolynomials}
            <td>{out.oid}</td>
            {/if}
            <td>{out.name}</td>
            <td>{out.orders.reduce((sum,id)=>sum+ordersTable.find(o=>o.id===id).value,0)}</td>
            {#if showPolynomials}
              <td><code>{out.polynomial}</code></td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>


<button class="btn btn-sm btn-outline-primary mb-2" on:click={() => showPolynomials = !showPolynomials}>
{showPolynomials ? 'Hide Provenance' : 'Show Provenance'}
</button>
<p>
The tables above show how lineage works at the tuple level. 
For example, the last row in the output is linked to the last rows from orders and customer tables.
By hovering over a customer or an order, you can see exactly which input rows contributed to each output.
</p>

<p>
Hovering is just one way to visualize lineage.
At its core, lineage is a graph connecting inputs to outputs, showing exactly how each input tuple contributes to each result.
There are many ways to represent this graph physically. 
</p>




<ProvPoly {customerTable} {ordersTable} {outputsTable}/>

<LineageBlocks {customerTable} {ordersTable}/>
