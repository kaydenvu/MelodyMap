<!-- Navbar.svelte -->

<script>
  import { getAuth, signOut } from "firebase/auth";
  import { auth } from "$lib/firebase.client.js";
  import { onMount } from "svelte";

  let user = null; // Store user state
  
  onMount(() => {
    // Check if user is signed in (you can also check this in a store for a more global state)
    auth.onAuthStateChanged((u) => {
      user = u; // Update user state
    });
  });

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // You can also redirect the user or update state here after signing out
      console.log("User signed out");
    } catch (error) {
      console.error("Sign out error: ", error);
    }
  };
</script>

<nav>
  <div class="wrapper">
    <div class="logo">
      <enhanced:img id="logoImg" src="/static/melody map logo.png" alt="Logo"></enhanced:img>
    </div>
    <input type="radio" name="slider" id="menu-btn">
    <input type="radio" name="slider" id="close-btn">
    <ul class="nav-links">
      <label for="close-btn" class="btn close-btn"><i class="fas fa-times"></i></label>
      <li><a href="/">Home</a></li>
      <li><a href="/about" class="desktop-item">About</a></li>
      <li><a href="/account" class="desktop-item">Account</a></li>
      
      <!-- Add Settings link, only visible if user is logged in -->
      {#if user}
        <li><a href="/settings" class="desktop-item">Settings</a></li>
        <li><button on:click={handleSignOut} class="signout-button">Sign Out</button></li>
      {:else}
        <li><a href="/Login">Sign In/Register</a></li>
      {/if}
    </ul>
    <label for="menu-btn" class="btn menu-btn"><i class="fas fa-bars"></i></label>
  </div>
</nav>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap');
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Ubuntu Sans', sans-serif;
    font-size: 20px;
    font-weight: 400;
  }

  @keyframes fadeLogo {
    from {
      opacity: 1;
    }
    to {
      opacity: 0.5;
    }
  }

  #logoImg {
    width: 210px; /* Adjust the width as needed */
    height: auto; /* Maintain aspect ratio */
    margin-top: 38px;
    margin-left: 10px;
    animation: fadeLogo 3s infinite alternate;
  }

  #logoImg:hover {
    cursor: pointer;
  }

  #logoImg:active {
    transform: scale(0.95);
  }

  nav {
    z-index: 99;
    width: 100%;
    height: 78px;
    background: #61b0ff;
  }
  
  nav .wrapper {
    position: relative;
    max-width: 1300px;
    padding: 0px 30px;
    height: 70px;
    line-height: 70px;
    margin: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .wrapper .logo a {
    color: #f2f2f2;
    font-size: 30px;
    font-weight: 600;
    text-decoration: none;
  }
  
  .wrapper .nav-links {
    display: inline-flex;
  }
  
  .nav-links li {
    list-style: none;
    margin-top: 10px;
  }
  
  .nav-links li a {
    color: #f7f7f7;
    text-decoration: none;
    font-size: 18px;
    font-weight: 500;
    padding: 9px 15px;
    border-radius: 5px;
    transition: all 0.3s ease;
  }
  
  .nav-links li a:hover {
    background: #3A3B3C;
  }

  .wrapper .btn {
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    display: none;
  }
  
  .wrapper .btn.close-btn {
    position: absolute;
    right: 30px;
    top: 10px;
  }

  nav input {
    display: none;
  }

  .signout-button {
    background: transparent;
    color: #f7f7f7;
    text-decoration: none;
    font-size: 18px;
    font-weight: 500;
    padding: 9px 15px;
    border-radius: 5px;
    border: none;
    transition: all 0.3s ease;
  }

  .signout-button:hover {
    background: #3A3B3C;
  }
  
</style>
