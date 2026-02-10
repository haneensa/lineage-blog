<script>
	import 'bootstrap/dist/css/bootstrap.min.css';
  import { base } from '$app/paths';
</script>

<!-- Navbar -->
<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
	<div class="container">
    <a class="navbar-brand" href="{base}">Lineage Blog</a>
		<div class="collapse navbar-collapse">
			<ul class="navbar-nav ms-auto">
        <li class="nav-item"><a class="nav-link" href="{base}">Main Post</a></li>
        <li class="nav-item"><a class="nav-link" href="{base}/part-a">Part A</a></li>
        <li class="nav-item"><a class="nav-link" href="{base}/part-b">Part B</a></li>
        <li class="nav-item"><a class="nav-link" href="{base}/part-c">Part C</a></li>
			</ul>
		</div>
	</div>
</nav>

<!-- Page content -->
<main class="mx-5 my-5">
	<slot />
</main>

