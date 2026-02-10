<script>
	import 'bootstrap/dist/css/bootstrap.min.css';
	import favicon from '$lib/assets/favicon.svg';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Navbar -->
<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
	<div class="container">
		<a class="navbar-brand" href="/">Lineage Blog</a>
		<div class="collapse navbar-collapse">
			<ul class="navbar-nav ms-auto">
				<li class="nav-item"><a class="nav-link" href="/">Main Post</a></li>
				<li class="nav-item"><a class="nav-link" href="/part-a">Part A</a></li>
				<li class="nav-item"><a class="nav-link" href="/part-b">Part B</a></li>
			</ul>
		</div>
	</div>
</nav>

<!-- Page content -->
<main class="mx-5 my-5">
	<slot />
</main>

