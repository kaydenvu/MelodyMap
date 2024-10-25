<script>
    import Navbar from '$lib/components/Navbar.svelte';
    import { getAuth, onAuthStateChanged } from "firebase/auth";
    import { onMount } from 'svelte';

    const auth = getAuth();
    let user = null; // To store user information
    let loading = true; // To handle loading state

    onMount(() => {
        onAuthStateChanged(auth, (currentUser) => {
            user = currentUser; // Set the user variable based on authentication state
            loading = false; // Set loading to false after checking auth state
        });
    });
</script>

<Navbar />

{#if loading}
    <p>Loading...</p>
{:else if user}
    <h1>Welcome, {user.displayName || 'User'}!</h1>
{:else}
    <h1>Welcome to Melody Map!</h1>
    <p>Please <a href="/Login">sign in</a> to continue.</p>
{/if}
