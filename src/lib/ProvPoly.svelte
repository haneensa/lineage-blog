<h2>Lineage Graph = Provenance Polynomials</h2>

<p>
Another way to reason about the lineage graph is mathematically, using provenance polynomials.
In this abstraction, each input tuple is assigned a variable (e.g., <code>c1</code> for the first customer, <code>o1</code> for the first order), 
and relational operations combine these variables to represent how outputs are constructed:
</p>

<ul>
  <li><strong>Join:</strong> multiply the variables of joined tuples</li>
  <li><strong>Union, projection, aggregation:</strong> add the variables of contributing tuples</li>
</ul>

<p>
For example, suppose customer <code>c1</code> is joined to orders <code>o1</code> and <code>o2</code> then its aggregated. 
The total spend for this customer can be represented as the polynomial: <code>c1*o1 + c1*o2</code>
</p>

<p>
This algebraic representation provides a compact, flexible summary of the same lineage graph.
For example, the lineage for each output row of Q1 can be written directly as a polynomial over input tuples:
</p>

<p>Each term shows a combination of customer and order rows that contributed to the output.</p>
<p>These polynomials let us reason about the workflow without recomputing the full lineage.
By assigning different values to the variables and how we interpret the binary operators <code>(+,x)</code>,
we can perform a wide range of practical analyses, such as:</p>

<ul>
  <li><strong>Aggregates:</strong> count(), sum(), or average() over any subset of inputs</li>
  <li><strong>Confidentiality scoring:</strong> propagate sensitivity levels from inputs to outputs</li>
  <li><strong>Probabilistic reasoning:</strong> evaluate uncertainty over inputs</li>
  <li>View maintenance: quickly determine which outputs to keep or delete</li>
  <li><strong>“What-if” scenarios:</strong> simulate deletions, updates, or modifications of input rows</li>
</ul>

