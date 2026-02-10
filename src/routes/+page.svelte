<script>
  import LineageTables from '$lib/LineageTables.svelte';

  let showFootnote = false;
</script>

<style>
   /* Global styles */
  /* Heading styles */
  .row {
    text-align: left;
  }

  /* Add space below h2 */
  h2 {
      margin-bottom: 20px; /* Adjust the value as needed */
  }

  /* Add space above h3 */
  h3 {
      margin-bottom: 20px; /* Adjust the value as needed */
  }

  a:hover {
    background: var(--bs-highlight-bg);
  }

  .lineage-img {
  max-width: 800px;
}
</style>


<main class="container-fluid">
  <h1>Fine-grained Lineage and Its Applications</h1>

  <div class="row ">
    <p>
    In modern data systems, understanding how data flows through pipelines is critical.
    From ETL jobs and streaming applications to analytics dashboards, relational databases sit at the core of most data processing.
    As raw data is transformed through many stages—across queries, scripts, and workflows—the process quickly becomes complex and hard to reason about.
    When something looks wrong, it’s often hard to tell why.
    </p>
<figure class="text-center my-4">
  <img
    src="/images/etl.jpg"
    alt="Lineage graph showing input-output dependencies"
    class="img-fluid my-3 lineage-img"
  />
  <!--figcaption class="text-muted mt-2">
    Figure 1: Lineage graph connecting input tuples to aggregated outputs.
  </figcaption-->
</figure>

    <p>
    This is where data provenance, or lineage, becomes essential
    <sup class="text-primary" style="cursor:pointer;"
    on:click={() => showFootnote = !showFootnote}>1</sup>.
    Lineage answers simple but powerful questions: Where did this data come from?
    Which inputs and scripts produced it? What would break if something changed?
    These questions are fundamental to debugging, reproducibility, and trust in data.
    </p>

{#if showFootnote}
  <div class="alert alert-secondary mt-2" style="font-size:0.9em;">
    Lineage and provenance can mean many things to many people.
    In general, they refer to metadata about objects and the dependencies between them.
    Objects can include datasets, models, scripts, or even humans and works of art.
    For example, family lineage models familial dependencies, while art provenance captures ownership history.
  </div>
{/if}

  <p>But, today’s lineage solutions track dependencies at the granularity of files and tables. 
      This means a user can track which files/tables an output of a data program depends on.
      Its coarse grained nature (e.g. output of Q(R) depends on input relation R) limits its usage. 
  For instance, how do you trace an error in a single row of data through your data warehouse back to its source(s)? How do you delete all rows of data about a user throughout your data lake? How do you figure out why an outlying value in your chart is so high?
  </p>
  
  <p>Fine-grained (row) provenance, also known as row-level lineage, quickly answers these questions and more [
    <a href="https://dspace.mit.edu/handle/1721.1/132280" target="_blank">2</a>, 
    <a href="http://www.vldb.org/pvldb/vol6/p553-wu.pdf" target="_blank">3</a>,
    <a href="https://www.vldb.org/conf/2004/RS22P1.PDF" target="_blank">4</a>,
    <a href="https://arxiv.org/abs/1805.02622" target="_blank">5</a>].
      It tracks relationship between input and output of a data program at the row-level.
    </p>

  <p>This is the essence of <em>data lineage</em>. Capturing lineage enables:</p>
  <ul>
    <li>Debugging: Identify the upstream rows responsible for anomalies.</li>
    <li>Compliance: Track sensitive or regulated data for audits.</li>
    <li>Optimization: Avoid unnecessary recomputation.</li>
    <li>“What-if” analysis: Evaluate the impact of changes in inputs.</li>
  </ul>
  </div>

  <h2>Tracing Lineage in Action</h2>
  <p>
  Fine-grained lineage lets us answer questions like “Which orders contributed to this customer’s total spend?” or 
  “If I delete this row, what outputs are affected?”
  To make this concrete, we’ll use a simple dataset of customers and their orders, and show how lineage lets us trace every output back to its exact inputs.
  </p>
  <p>
  Let’s start with two simple tables: customer and orders.
  The customer table lists individual customers along with their region, while the orders table records each purchase, its value, and sensitivity level.
  </p>
  <LineageTables/>

  <h2 class="mt-4 mb-3">Follow-ups</h2>
  <ul>
    <li><a class="link-primary" href="/part-a">What-ifs? How to evaluate many provenance polynomials fast</a></li>
    <li><a class="link-primary" href="/part-b">Lineage as a DuckDB Extension</a></li>
  </ul>
 
</main>

