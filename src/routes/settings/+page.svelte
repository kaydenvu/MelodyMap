<script>
    import { writable } from 'svelte/store';
    import { auth } from '$lib/firebase.client.js';
    import { onMount } from 'svelte';
    import { getAuth, updateProfile } from 'firebase/auth';
    import { goto } from '$app/navigation'; // for navigation after save

    let newDisplayName = writable('');
    let currentDisplayName = writable('');
    let isSaving = writable(false);
    let errorMessage = writable('');
    let successMessage = writable('');
    let user = writable(null); // Store for user info

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                user.set(currentUser); // Set the user when authenticated
                currentDisplayName.set(currentUser.displayName || 'No display name set');
                newDisplayName.set(currentUser.displayName || '');
            } else {
                user.set(null); // Handle the case where no user is logged in
            }
        });

        // Clean up the listener when the component is destroyed
        return () => unsubscribe();
    });

    const updateUserName = async () => {
        const name = $newDisplayName.trim();
        if (!name) {
            errorMessage.set('Display name cannot be empty.');
            return;
        }

        try {
            isSaving.set(true);
            const currentUser = $user;
            if (currentUser) {
                await updateProfile(currentUser, { displayName: name });
                currentDisplayName.set(name);
                successMessage.set('Display name updated successfully!');
                errorMessage.set('');
                newDisplayName.set(name);
                setTimeout(() => goto('/'), 1500); // Optionally navigate to another page
            }
        } catch (error) {
            console.error('Error updating display name:', error);
            errorMessage.set('Failed to update display name. Please try again.');
        } finally {
            isSaving.set(false);
        }
    };
</script>

<main class="settings-page">
    <h1>Account Settings</h1>

    {#if $successMessage}
        <div class="alert success">
            <p>{$successMessage}</p>
        </div>
    {/if}

    {#if $errorMessage}
        <div class="alert error">
            <p>{$errorMessage}</p>
        </div>
    {/if}

    {#if $user}
        <section class="profile-section">
            <h2>Update Display Name</h2>
            <p>Current display name: <strong>{$currentDisplayName}</strong></p>

            <input
                type="text"
                bind:value={$newDisplayName}
                placeholder="Enter new display name"
                disabled={$isSaving}
            />

            <button
                on:click={updateUserName}
                disabled={$isSaving || $newDisplayName.trim() === ''}
            >
                {#if $isSaving}
                    Saving...
                {:else}
                    Save Changes
                {/if}
            </button>
        </section>
    {:else}
        <p>Please sign in to update your settings.</p>
    {/if}

    <section class="other-settings">
        <h2>Other Settings</h2>
        <p>Coming soon...</p>
    </section>
</main>

<style>
    .settings-page {
        max-width: 500px;
        margin: 0 auto;
        padding: 2rem;
    }

    h1 {
        text-align: center;
        margin-bottom: 1.5rem;
    }

    .alert {
        padding: 10px;
        margin-bottom: 1rem;
        border-radius: 5px;
    }

    .alert.success {
        background-color: #d4edda;
        color: #155724;
    }

    .alert.error {
        background-color: #f8d7da;
        color: #721c24;
    }

    .profile-section {
        margin-bottom: 2rem;
    }

    input {
        width: 100%;
        padding: 10px;
        margin-bottom: 1rem;
        border: 1px solid #ccc;
        border-radius: 5px;
        font-size: 1rem;
    }

    button {
        padding: 10px 15px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }

    button:disabled {
        background-color: #ccc;
    }

    .other-settings {
        margin-top: 2rem;
    }
</style>
