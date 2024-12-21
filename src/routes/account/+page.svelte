<script>
    import Navbar from '$lib/components/Navbar.svelte';
    import { getAuth, onAuthStateChanged } from "firebase/auth";
    import { auth } from "$lib/firebase.client.js";
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
    
    let user = writable(null);  // To store user information
    let loading = writable(true); // To handle loading state

    onMount(() => {
        onAuthStateChanged(auth, (currentUser) => {
            user.set(currentUser); // Set the user variable based on authentication state
            loading.set(false); // Set loading to false after checking auth state
        });
    });
    const updateUserName = async (newDisplayName) => {
        const currentUser = auth.currentUser;
        if (currentUser && newDisplayName) {
            try {
                await updateProfile(currentUser, {
                    displayName: newDisplayName
                });
                user.update(userData => {
                    if (userData) {
                        userData.displayName = newDisplayName; // Update user display name
                    }
                    return userData;
                });
            } catch (error) {
                console.error('Error updating display name:', error.message);
            }
        }
    };
</script>

<Navbar />

{#if $loading}
    <p>Loading...</p>
{:else if $user}
    <h1>Welcome, {$user.displayName || 'user'}!</h1>
    {#if !$user.displayName}
        <p>Your display name is not set. <a href="/settings">Click here</a> to set it.</p>
    {/if}
{:else}
    <h1>Welcome to Melody Map!</h1>
    <p>Please <a href="/Login">sign in</a> to continue.</p>
{/if}
