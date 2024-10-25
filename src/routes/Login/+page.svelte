<script>
    import Navbar from '$lib/components/Navbar.svelte';
    import { browser } from "$app/environment";
    import { auth } from '$lib/firebase.client.js';
    import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
    import { goto } from '$app/navigation';

    let email = '';
    let password = '';
    let isSignUp = false; // Toggle between login and sign up mode
    let errorMessage = '';

    // Handle form submission based on the login or signup mode
    async function submitForm() {
        try {
            if (!email || !password) {
                errorMessage = 'Please fill in both fields.';
                return;
            }

            if (isSignUp) {
                // Sign up a new user
                await createUserWithEmailAndPassword(auth, email, password);
                alert('Account created successfully! You can now log in.');
                isSignUp = false; // Switch back to login mode
            } else {
                // Log in an existing user
                await signInWithEmailAndPassword(auth, email, password);
                goto('/account'); // Redirect after successful login
            }
        } catch (error) {
            errorMessage = error.message; // Display error message
        }
    }

    // Handle form submission
    function handleSubmit(event) {
        event.preventDefault(); // Prevent form from refreshing the page
        submitForm();
    }
</script>

<Navbar />

<div class="auth-container">
    <h1>{isSignUp ? 'Sign up' : 'Login'}</h1>

    <form on:submit={handleSubmit}>
        <label>
            Email
            <input type="email" bind:value={email} placeholder="Email" required />
        </label>
        <label>
            Password
            <input type="password" bind:value={password} placeholder="Password" required />
        </label>
        {#if errorMessage}
            <p class="error">{errorMessage}</p>
        {/if}
        <button type="submit">{isSignUp ? 'Sign up' : 'Login'}</button>
    </form>

    <p>
        {isSignUp
            ? 'Already have an account?'
            : 'Don’t have an account?'}
        <a href="#" on:click="{() => (isSignUp = !isSignUp)}">
            {isSignUp ? 'Log in' : 'Sign up'}
        </a>
    </p>
</div>

<style>
    .auth-container {
        width: 300px;
        margin: auto;
        padding: 2rem;
        background-color: #f9f9f9;
        border-radius: 10px;
        box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
        text-align: center;
    }

    h1 {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        margin-bottom: 1rem;
    }

    input {
        width: 100%;
        padding: 0.5rem;
        margin-top: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 5px;
    }

    button {
        width: 100%;
        padding: 0.7rem;
        background-color: #61b0ff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1rem;
        margin-top: 1rem;
    }

    button:hover {
        background-color: #3a9fd1;
    }

    .error {
        color: red;
        margin-bottom: 1rem;
    }

    p {
        margin-top: 1rem;
    }

    a {
        color: #61b0ff;
        cursor: pointer;
    }

    .auth-container {
        width: 300px;
        margin: auto;
        padding: 2rem;
        background-color: #f9f9f9;
        border-radius: 10px;
        box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
        text-align: center;
    }

    h1 {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        margin-bottom: 1rem;
    }

    input {
        width: 100%;
        padding: 0.5rem;
        margin-top: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 5px;
    }

    button {
        width: 100%;
        padding: 0.7rem;
        background-color: #61b0ff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1rem;
        margin-top: 1rem;
    }

    button:hover {
        background-color: #3a9fd1;
    }

    .error {
        color: red;
        margin-bottom: 1rem;
    }

    p {
        margin-top: 1rem;
    }

    a {
        color: #61b0ff;
        cursor: pointer;
    }
</style>