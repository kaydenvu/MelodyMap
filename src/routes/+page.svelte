<script>
    import Navbar from '$lib/components/Navbar.svelte';
    import Greetings from '$lib/components/Greetings.svelte';
    export let title = 'Melody Map';

    import { browser } from '$app/environment';
    import pkg from 'ngeohash';
    import { onMount, onDestroy } from 'svelte';
    import { goto } from '$app/navigation'; 
    import { writable } from 'svelte/store';
    import { db, auth } from '$lib/firebase.client.js';
    import { onAuthStateChanged } from "firebase/auth";
    import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
    import { query, where, getDocs } from 'firebase/firestore';
    
	const { encode } = pkg;

    const PUBLIC_GOOGLE_MAPS_API_KEY = import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_API_KEY;
    const TICKETMASTER_API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;

    let Map, Marker, InfoWindow;
    let map_object; // the Google Maps object
    let map_element; // the DOM element
    let address = ""; // User's input for the address
    let coordinates = null; // Store the geocoded coordinates
    let errorMessage = ""; // Error message if geocoding fails
    let autocomplete;
    
    let directionsService;
    let directionsRenderer;

    let showLoadMoreButton = false; // Track when to show the button
    let isLoading = false; // Track when data is being fetched
    let currentPageUrl = writable(null); // Track the current page URL
    let concerts = writable([]); // Holds the list of concerts
    let filteredConcerts = writable([]); // Holds the filtered concerts

    // Define the search input and search type
    let searchType = "artist"; // Default search type (artist or venue)
    let searchInput = ""; // This is the text input for search

    let user = writable(null);  // To store user information
    let loading = writable(true); // To handle loading state

    onMount(() => {
        onAuthStateChanged(auth, (currentUser) => {
            user.set(currentUser); // Set the user variable based on authentication state
            loading.set(false); // Set loading to false after checking auth state
        });
    });

    export function loadMoreEvents() {
        currentPageSize += 50;
        fetchMusicEvents(lat, lng);
    }
    
    const initialMapDisplayOptions = {
        zoom: 8,
        center: { lat: 35, lng: -110 },
        mapId: 'SAMPLE_MAP_ID'
    };

    if (browser) {
        // Ensure the Google Maps script is loaded before using any maps functionality
        loadGoogleMapsAPI().then(() => {
            map_element = document.getElementById('map');
            initializeMap();
            initializeAutocomplete();
        });
    }

    async function loadGoogleMapsAPI() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
            script.async = true;
            window.initMap = () => resolve();
            script.onerror = () => reject(new Error('Google Maps API failed to load'));
            document.head.appendChild(script);
        });
    }

    // Function to initialize the Google Maps Autocomplete API
    function initializeAutocomplete() {
        const input = document.getElementById('address');
        autocomplete = new google.maps.places.Autocomplete(input);
        autocomplete.setFields(['address_component', 'geometry']);

        // Add listener to handle the selected address
        autocomplete.addListener('place_changed', onPlaceChanged);
    }

    function onPlaceChanged() {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            errorMessage = "No details available for the selected address.";
            coordinates = null;
            return;
        }

        const location = place.geometry.location;
        // Update the address with the selected place's formatted address
        if (place.address_components) {
            address = place.address_components
                .map(component => component.long_name) // Extract long_name from each component
                .join(', '); // Combine the components with a comma and space
        } else {
            address = "Address details not available";
        }

        coordinates = {
            lat: location.lat(),
            lng: location.lng(),
        };    
        errorMessage = "";
    }
    // Function to geocode address using Google Maps Geocoding API
    async function geocodeAddress() {
        if (!address) {
            errorMessage = "Please enter an address.";
            return;
        }

        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                    address
                )}&key=${PUBLIC_GOOGLE_MAPS_API_KEY}`
            );

            const data = await response.json();

            console.log(address);
            console.log(data);

            if (data.status === "OK" && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                coordinates = {
                    lat: location.lat,
                    lng: location.lng,
                };
                errorMessage = "";
            } else {
                errorMessage = "Could not find coordinates for the provided address.";
                coordinates = null;
            }
        } catch (error) {
            errorMessage = "An error occurred while fetching the coordinates.";
            coordinates = null;
        }
    }

    function useCoordinates() {
        if (coordinates && coordinates.lat && coordinates.lng) {
            const lat = coordinates.lat;
            const lng = coordinates.lng;

            // Center the map using the coordinates
            map_object.setCenter({ lat, lng });
            map_object.setZoom(10);
            clearMarkers();
            // Fetch music events based on the coordinates
            fetchMusicEvents(lat, lng)
                .then((data) => {
                    console.log("Fetched music events:", data);
                    processConcertData(data);  // Process concert data as required
                    updateConcertList(data);   // Update the concert list with the new data
                })
                .catch((error) => {
                    console.error("Error fetching music events:", error);
                    errorMessage = "There was an error fetching music events.";
                });
        } else {
            console.log("Coordinates are not valid:", coordinates);
            errorMessage = "Please provide a valid address first.";
        }
    }

    async function initializeMap() {
        await window.initMap;
        Map = google.maps.Map;
        Marker = google.maps.Marker;
        InfoWindow = google.maps.InfoWindow;

        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer();

        map_object = new Map(map_element, initialMapDisplayOptions);
        directionsRenderer.setMap(map_object);
    }

    function onMapViewportChanged() {
        const center = map_object.getCenter();
        lat = center.lat();
        lng = center.lng();

        // Clear existing markers if necessary
        clearMarkers();

        // Fetch new events and update the list
        fetchMusicEvents(lat, lng).then((data) => {
            processConcertData(data);
            updateConcertList(data);
        });
    }

    function clearMarkers() {
    for (let marker of concertMarkers) {
        marker.setMap(null);
    }
    concertMarkers = []; // Reset the markers array
}

    let lat, lng;

    
    function clearCoordinates() {
        lat = null;
        lng = null;
    }

	function get_current_position() {
        navigator.geolocation.getCurrentPosition((position) => {
            lat = position.coords.latitude;
            lng = position.coords.longitude;

            map_object.setCenter({ lat, lng });
            fetchMusicEvents(lat, lng).then((data) => {
                processConcertData(data);
                updateConcertList(data);
            });
        }, (error) => {
            console.error('Error getting current position:', error);
        });
    }
    let currentPageSize = 50;
    function fetchMusicEvents(latitude, longitude) {
        return new Promise((resolve, reject) => {
            const geoHash = calculateGeoHash(latitude, longitude);
            const concertEndpoint = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_API_KEY}&keyword=music&radius=50&locale=*&geoPoint=${geoHash}&size=${currentPageSize}`;

            fetch(concertEndpoint)
                .then(response => response.json())
                .then(data => {
                    // Process and update concert data
                    processConcertData(data);
                    updateConcertList(data);

                    // Check if there are more events to load
                    if (data._embedded.events.length < currentPageSize) {
                        showLoadMoreButton = false;
                    } else {
                        showLoadMoreButton = true;
                    }
                    concerts.set(data._embedded.events || []);
                    filteredConcerts.set(data._embedded.events || []);

                    // Resolve the promise with the data
                    resolve(data);
                })
                .catch(error => {
                    console.error('Error fetching music events:', error);
                    reject(error);  // Reject the promise if there's an error
                });
        });
    }
    function calculateGeoHash(latitude, longitude) {
        return encode(latitude, longitude, 5); // GeoHash precision
    }

	let selectedEventDetails = null;

	// Define an array to store concert markers
	let concertMarkers = [];
    let openInfoWindow = null;

    function showConcertList() {
    const sidebarContainer = document.getElementById('sidebar-container');
    sidebarContainer.style.display = 'block'; // Show the concert list container
    console.log('Concert list shown'); // Debugging: Check if concert list is shown
}

	function create_marker(lat, lng, event) {
        const marker = new Marker({
            map: map_object,
            position: { lat, lng },
            title: event.name
        });

        marker.addListener('click', () => {
        showConcertList(); // Show the concert list when a marker is clicked
        const infoWindowContent = document.createElement('div');
		infoWindowContent.className = 'event-details'; // Apply the event-details class

        const title = document.createElement('h3');
        title.textContent = event.name;

        const startDate = document.createElement('p');
        startDate.textContent = event.dates.start.localDate;

        const venueName = document.createElement('p');
        venueName.textContent = event._embedded.venues[0].name;

		const address = document.createElement('p');
		address.textContent = event._embedded.venues[0].address.line1;

		const info = document.createElement('p');
        info.textContent = event.info;

        infoWindowContent.appendChild(title);
        infoWindowContent.appendChild(startDate);
        infoWindowContent.appendChild(venueName);
		infoWindowContent.appendChild(address);
		infoWindowContent.appendChild(info);

        // Add a button or link in your infoWindowContent that calls getDirections when clicked
        const directionsButton = document.createElement('button');
        directionsButton.textContent = 'Get Directions';
        directionsButton.onclick = () => {
            if (openInfoWindow) { 
                openInfoWindow.close(); // Close the currently open info window
            }
            getDirections({ lat, lng });
            // Toggle the visibility of the directions container
            const directionsContainer = document.getElementById('directions-container');
            if (directionsContainer.style.display === 'none') {
                directionsContainer.style.display = 'block';
            } else {
                directionsContainer.style.display = 'none';
            }
        };

        directionsButton.addEventListener('click', () => {
                    // Toggle the visibility of the directions container
            if (directionsContainer.style.display === 'none') {
                directionsContainer.style.display = 'block';
            } else {
                directionsContainer.style.display = 'none';
            }
        });

        
        infoWindowContent.appendChild(directionsButton);

        const markerInfoWindow = new InfoWindow({
        content: infoWindowContent
    });

        marker.addListener('click', () => {
        if (openInfoWindow) {
            openInfoWindow.close(); // Close the currently open info window
        }
        markerInfoWindow.open(map_object, marker);
        openInfoWindow = markerInfoWindow; // Update openInfoWindow to this infoWindow
    });

            selectedEventDetails = event; // For use in a detailed view if needed
        });
    }


    function processConcertData(data) {
        if (!data || !data._embedded || !data._embedded.events) {
            console.error('No events found in the data.');
            return;
        }

        data._embedded.events.forEach(event => {
            const { venues } = event._embedded;
            if (venues && venues.length > 0) {
                const venue = venues[0];
                const latitude = parseFloat(venue.location.latitude);
                const longitude = parseFloat(venue.location.longitude);
                create_marker(latitude, longitude, event);
            }
        });
    }

	function updateConcertList(data) {
        const concertListElement = document.getElementById('concert-list-items');
        concertListElement.innerHTML = ''; // Clear previous list

        const uniqueEventNames = new Set();
        const searchType = document.getElementById('search-type').value;
        const searchInput = document.getElementById('search-input').value.toLowerCase();

        // Sort the events by start date in ascending order
        data._embedded.events.sort((a, b) => {
            const dateA = new Date(a.dates.start.localDate);
            const dateB = new Date(b.dates.start.localDate);
            return dateA - dateB;
        });

        data._embedded.events.forEach((event, index) => {

            const eventName = event.name.toLowerCase();
            const venueName = event._embedded.venues[0].name.toLowerCase();
            
            if (!uniqueEventNames.has(event.name)) {
            const concertItem = document.createElement('li');
            concertItem.className = 'concert-item';
                
            const eventName = document.createElement('h2');
            eventName.className = 'event-name';
            eventName.textContent = event.name; // Set event name as text content
            concertItem.appendChild(eventName); // Add bold event name to li element

            const eventDetailDiv = document.createElement('div');
            eventDetailDiv.className = 'event-details';

            const startDate = document.createElement('p');
            startDate.textContent = `Date: ${event.dates.start.localDate}`;
            eventDetailDiv.appendChild(startDate);

            const venueName = document.createElement('p');
            venueName.textContent = `Venue: ${event._embedded.venues[0].name}`;
            eventDetailDiv.appendChild(venueName);

            const startDateTime = document.createElement('p');
            startDateTime.textContent = event.dates.start.localTime
                ? `Time: ${event.dates.start.localTime}`
                : 'Time: Unavailable';
            eventDetailDiv.appendChild(startDateTime);

            const address = document.createElement('p');
            address.textContent = `Address: ${event._embedded.venues[0].address.line1}`;
            eventDetailDiv.appendChild(address);

            if (event.url) { // Check if the event.url property exists
                const ticketLink = document.createElement('a');
                ticketLink.href = event.url; // Set the URL for the ticket link
                ticketLink.textContent = 'Tickets'; // Text displayed for the link
                ticketLink.target = '_blank'; // Open link in a new tab
                ticketLink.style.background = '#61b0ff';
                ticketLink.style.color = 'white';
                ticketLink.style.border = 'none';
                ticketLink.style.padding = '10px 20px';
                ticketLink.style.borderRadius = '5px';
                ticketLink.style.cursor = 'pointer';
                eventDetailDiv.appendChild(ticketLink);
            }

            concertItem.appendChild(eventDetailDiv);
            concertListElement.appendChild(concertItem);
            uniqueEventNames.add(event.name);
            }
        });
    }

 // Function to filter concerts based on search input
    function filterSearch() {
        const query = searchInput.toLowerCase().trim();
        concerts.subscribe((concertList) => {
            let result = concertList.filter((concert) => {
                const eventName = concert.name.toLowerCase();
                const venueName = concert._embedded.venues[0].name.toLowerCase();
                
                if (searchType === 'artist') {
                    return eventName.includes(query);
                } else if (searchType === 'venue') {
                    return venueName.includes(query);
                }
                return false;
            });

            // Sort filtered results by start date
            result.sort((a, b) => {
                const dateA = new Date(a.dates.start.localDate);
                const dateB = new Date(b.dates.start.localDate);
                return dateA - dateB;
            });

            filteredConcerts.set(result); // Update the filtered concert list
        });
    }



function getDirections(destination) {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const origin = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                calculateAndDisplayRoute(origin, destination);
            },
            (error) => {
                console.error('Error getting current position for directions:', error);
            }
        );
    } else {
        // Handle the case where the browser doesn't support geolocation
        console.error('Geolocation is not supported by this browser.');
    }
}

function displayTravelDuration(directionsResult) {
    const route = directionsResult.routes[0];
    const duration = route.legs[0].duration.text;

    const durationElement = document.getElementById('travel-duration');
    durationElement.textContent = `Estimated Travel Time: ${duration}`;
}


function displayTravelDistance(directionsResult) {
    const route = directionsResult.routes[0];
    const distance = route.legs[0].distance.text;

    const distanceElement = document.getElementById('travel-distance');
    distanceElement.textContent = `Travel Distance: ${distance}`;
}

function calculateAndDisplayRoute(origin, destination) {
    const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING // You can change the travel mode
    };

    directionsService.route(request, function(response, status) {
        if (status === 'OK') {
            // Display the route on the map
            directionsRenderer.setDirections(response);
            // Extract and display the travel distance
            displayTravelDistance(response);
            displayTravelDuration(response);

            // Clear previous directions content
            const directionsContent = document.getElementById('directions-instructions');
            directionsContent.innerHTML = '';

            // Get the directions steps as an array
            const steps = response.routes[0].legs[0].steps;

            // Create the content for the directions pop-up
            let directionsList = '<h3>Directions</h3><ol>';
            for (let i = 0; i < steps.length; i++) {
                directionsList += `<li>${steps[i].instructions}</li>`;
            }
            directionsList += '</ol>';

            // Set the directions content in the designated element
            directionsContent.innerHTML = directionsList;
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    });

    document.addEventListener('DOMContentLoaded', function() {
    const directionsContainer = document.getElementById('directions-container');
    const getDirectionsBtn = document.getElementById('getDirectionsBtn');

    // Hide the directions container by default
    directionsContainer.style.display = 'none';

    getDirectionsBtn.addEventListener('click', function() {
        // Toggle the visibility of the directions container
        if (directionsContainer.style.display === 'none') {
            directionsContainer.style.display = 'block';
        } else {
            directionsContainer.style.display = 'none';
        }
    });
});

}


    // Function to save event details to Firestore
    async function saveEventDetails() {
        try {
            const user = auth.currentUser; // Ensure the user is authenticated
            if (!user) {
                console.log("User is not logged in");
                return;
            }

            // Define the event details you want to save
            const eventData = {
                userId: user.uid, // User ID from Firebase Authentication
                name: selectedEventDetails.name,  // Event name
                date: selectedEventDetails.dates.start.localDate, // Event date
                time: selectedEventDetails.dates.start.localTime || 'Unavailable', // Event time
                venue: selectedEventDetails._embedded.venues[0].name, // Venue name
                address: selectedEventDetails._embedded.venues[0].address.line1, // Venue address
                url: selectedEventDetails.url, // Event ticket URL
                savedAt: serverTimestamp()  // Timestamp for when the event is saved
            };

             // Query Firestore to check if the event is already saved for this user
            const q = query(
                collection(db, 'saved_events'),
                where('userId', '==', user.uid),
                where('name', '==', eventData.name),
                where('date', '==', eventData.date)
            );

            const querySnapshot = await getDocs(q);

            // If the event exists, don't save it again
            if (!querySnapshot.empty) {
                alert("This event is already saved to your account.");
                return;
            }

            // Save the event data to the 'saved_events' collection in Firestore
            const docRef = await addDoc(collection(db, 'saved_events'), eventData);

            // Successfully saved to Firestore
            console.log("Event saved with ID: ", docRef.id);
            alert("Event saved!");
        } catch (error) {
            console.error("Error saving event: ", error);
        }
    }

</script>

<Greetings/>
<Navbar />

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poetsen+One&display=swap" rel="stylesheet">

<svelte:head>
    <title>{title}</title>
</svelte:head>

<div id="app-container">
    <div id="map-container">
        <div id="map"></div>
    </div>

    <div id="sidebar-container">
        <h2>Concerts</h2>
        <div class="search-container" style="margin-bottom: 20px;">
            <select id="search-type" style="width: 100%; padding: 8px; margin-bottom: 10px;">
                <option value="artist">Artist</option>
                <option value="venue">Venue</option>
            </select>
            <input 
                type="text" 
                id="search-input" 
                bind:value={searchInput} 
                placeholder="Search by concert or artist" 
                style="width: 100%; padding: 8px; margin-bottom: 10px;" 
            />
            <button 
                id="search-button" 
                on:click={filterSearch} 
                style="width: 100%; padding: 10px; background-color: #61b0ff; color: white; border: none; cursor: pointer;">
                Search
            </button>
        </div>

        <!-- Concert List -->
        <ul id="concert-list-items" style="list-style: none; padding: 0; margin: 0;">
        </ul>
        <button id="load-more-button" on:click={loadMoreEvents}>Load More</button>
    </div>
</div>
<!-- 
	<div class="input-container">
		<label for="lat">Latitude:</label>
		<input name="lat" type="text" bind:value={lat} />
		<label for="lng">Longitude:</label>
		<input name="lng" type="text" bind:value={lng} />
	</div>
-->
<div class="button-container">
    <button id="currentPositionBtn" on:click={get_current_position}>Search by Current Position</button>
    <button id="searchAreaBtn" on:click={onMapViewportChanged}>Search in this area</button>
    <!-- <button id="clearCoordinatesBtn" on:click={clearCoordinates}>Clear Coordinates</button>
    -->
    <div class="address-search-container">
        <h1>Search by Address</h1>

        <label for="address">Enter Address:</label>
        <input 
            type="text" 
            id="address" 
            bind:value={address} 
            placeholder="Type address" 
        />

        <button on:click={geocodeAddress}>Search</button>

        {#if errorMessage}
            <p class="error">{errorMessage}</p>
        {/if}

        {#if coordinates}
            <p>Address: {address}</p>
            <button on:click={useCoordinates}>Search Here</button>
        {/if}
    </div>
</div>

<div id="directions-container" style="display: none;">
    <div id="travel-distance"></div>
    <div id="travel-duration"></div>
    <div id="directions-instructions"></div>
</div>


{#if selectedEventDetails}
    <div class="event-details">
        <h2>{selectedEventDetails.name}</h2>
        <p>Date: {selectedEventDetails.dates.start.localDate}</p>
        <p>Venue: {selectedEventDetails._embedded.venues[0].name}</p>
        <p>Address: {selectedEventDetails._embedded.venues[0].address.line1}</p>
        {#if selectedEventDetails.info}
            <p>Info: {selectedEventDetails.info}</p>
        {:else}
            <p>Info: Unavailable</p>
        {/if}
        <img src={selectedEventDetails.images[0].url} alt={selectedEventDetails.name} style="width: 100%; max-width: 300px;">
        <p><a href={selectedEventDetails.url} target="_blank">Tickets</a></p>
        {#if $user}
            <!-- Button to save event if user is logged in -->
            <p> <button on:click={saveEventDetails} class="login-btn">Save to My Account</button> </p>
        {:else}
            <!-- Button to prompt user to log in -->
            <p>Please <button on:click={() => goto('/Login')} class="login-btn">Log in</button> to save this event.</p>
        {/if}
    </div>
{/if}



<style>
	@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap');

	:global {
        body {
            background-color: #f0f0f0; 
        }
    }
	.input-container {
        margin-bottom: 10px;
    }

    .input-container label {
        width: 60px;
        text-align: right;
        margin-bottom: 30px;
    }

    .input-container input {
        flex: 1;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 16px;
		margin-right: 36px;
        transform: translate(0%, 10%);
    }

    .input-container label {
        font-size: 16px;
        color: #333;
    }
	
    #map {
        height: 640px;
		margin-right: 20px;
		border-radius: 10px;
		margin-top: 10px;
    }

	/* Style the buttons */
	#currentPositionBtn,
	#searchAreaBtn,
    #clearCoordinatesBtn{
		text-align: center;
		margin-top: 0px;
		padding: 10px 20px;
		background-color: #61b0ff; /* Blue background */
		color: white;
		border: none;
		cursor: pointer;
		border-radius: 5px;
		transition: background-color 0.3s ease;
	}

	/* Hover effect */
	#currentPositionBtn:hover,
	#searchAreaBtn:hover,
    #clearCoordinatesBtn:hover{
		background-color: #4aa0f7; /* Darker blue */
	}

    /* Container style */
    .event-details {
        /* border: 2px solid #BCD8C1; */
        border-radius: 5px;
        box-shadow: 0px 10px 12px rgba(0, 0, 0, 0.1);
        position: absolute;
        transform: translate(12%, 5%);
        width: 1000px;
        padding: 20px;
        background-color: #252826;
    }

    /* Center align all text content */
    .event-details * {
        text-align: center;
        color:#fff
    }

    /* Style the image */
    .event-details img {
        display: block;
        margin: 0 auto;
        max-width: 100%;
        border-radius: 5px;
        margin-bottom: 10px;
    }

    /* Style the title */
    .event-details h2 {
        font-family: "Poetsen One", sans-serif;
        color: #fff; 
        font-size: 24px;
        margin-bottom: 10px;
    }

    /* Style the description paragraphs */
    .event-details p {
        line-height: 1.6;
        margin-bottom: 10px;
        font-family: 'Poppins', sans-serif;
    }

    /* Style the anchor links */
    .event-details a {
        display: inline-block;
        margin-top: 15px;
        padding: 8px 20px;
        background-color: #007bff; /* Blue background color */
        color: #fff; /* White text color */
        text-decoration: none;
        border-radius: 5px;
        transition: background-color 0.3s ease;
    }

    /* Hover effect for anchor links */
    .event-details a:hover {
        background-color: #0056b3; /* Darker blue */
    }


    #app-container {
        display: flex;
        height: 100vh; /* Use the full height of the viewport */
        margin: 0;
        padding: 0;
    }

    #map-container {
        width: 80%;
		position: relative;
        flex-grow: 1; /* Allow the map to fill the remaining space */
        padding: 0;  /* Remove padding */
        justify-content: space-between;
        margin-bottom: 0px;
    }

    #sidebar-container {
        display: none;
        width: 300px; /* Set a fixed width for the sidebar */
        overflow-y: auto; /* Add scroll for overflowing content */
        background-color: white;
        box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
        padding: 20px; 
    }

    #concert-list-items {
        list-style-type: none;
        padding: 0;
        margin: 0;
        color: #656565;
        margin-bottom: 10px; /* Adjust as needed */
    }

    #sidebar-container h2 {
        color: #333;                  /* Change the text color */
        font-size: 1.5em;             /* Set the font size */
        margin: 0 0 20px 0;           /* Add some margin */
        padding: 10px;                /* Add some padding */
        border-bottom: 2px solid #eaeaea; /* Add a bottom border */
        font-family: Roboto;
        text-align: center;           /* Center the text */
        /* Add additional styles as needed */
    }

    /* Style for the directions container */
    #directions-container {
        background-color: #f8f9fa; /* Light background color */
        border: 1px solid #ced4da; /* Gray border */
        border-radius: 8px; /* Rounded corners */
        padding: 20px; /* Increased padding */
        max-height: 400px; /* Increased maximum height */
        overflow-y: auto; /* Enable scrolling */
        transition: opacity 0.3s ease; /* Fade-in animation */
        opacity: 0; /* Initially hidden */
    }

    /* Style for the travel distance */
    #travel-distance {
        font-weight: bold;
        text-align: center;
        font-size: 1.2em;
    }

    /* Style for the travel duration */
    #travel-duration {
        font-weight: bold;
        text-align: center;
    }

    /* Hover effect for the directions container */
    #directions-container:hover {
        opacity: 1; /* Show container on hover */
    }

    /* Animation for expanding/collapsing directions container */
    @keyframes expandDown {
        from {
            max-height: 0;
            opacity: 0;
        }
        to {
            max-height: 400px;
            opacity: 1;
        }
    }

    /* Apply animation to directions container */
    #directions-container {
        animation: expandDown 0.5s ease forwards; /* Animation on opening */
    }

    /* Style for the load more button */
    #load-more-button {
        display: block;
        margin: 0 auto;
        padding: 10px 20px;
        background-color: #61b0ff; /* Blue background */
        color: white; /* White text color */
        border: none; /* Remove border */
        border-radius: 5px; /* Rounded corners */
        cursor: pointer; /* Change cursor to pointer */
        transition: background-color 0.3s ease; /* Smooth transition */
        margin-top: 30px; /* Add some top margin */
    }

    /* Hover effect for the load more button */
    #load-more-button:hover {
        background-color: #4aa0f7; /* Darker blue */
    }

    /* Style for the search input */
    #search-input {
        border: 1px solid #ccc; /* Add border */
        border-radius: 4px; /* Rounded corners */
        font-size: 9px; /* Set font size */
        width: 65%; /* Set width */
        margin-right: 10px; /* Add right margin */
        padding: 8px; /* Add padding */
    }

    /* Style for the search button */
    #search-button {
        padding: 6px 10px; /* Add padding */    
        background-color: #61b0ff; /* Blue background */
        color: white; /* White text color */
        border: none; /* Remove border */
        border-radius: 4px; /* Rounded corners */
        cursor: pointer; /* Change cursor to pointer */
        transition: background-color 0.3s ease; /* Smooth transition */
    }

    /* Hover effect for the search button */
    #search-button:hover {
        background-color: #4aa0f7; /* Darker blue */
    }

    /* Style for the search container */
    .search-container {
        display: flex; /* Use flexbox */
        align-items: center; /* Center vertically */
        margin-bottom: 20px; /* Add bottom margin */
        padding: 0;  /* Remove padding */
    }

    /* Style for the search type select */
    #search-type {
        border: 1px solid #ccc; /* Add border */
        border-radius: 4px; /* Rounded corners */
        font-size: 9px; /* Set font size */
        padding: 6px; /* Add padding */
        margin-right: 10px; /* Add right margin */
    }

    .button-container {
        display: flex;
        flex-direction: row;  /* Align items horizontally */
        gap: 20px;  /* Space between items */
        align-items: center;  /* Vertically align items */
        padding: 0;  /* Remove padding */
        margin-top: 0px; /* Space between map container and buttons */
    }

    .login-btn {
        background-color: #61b0ff; /* Blue background */
        color: white;  /* White text */
        border: none;  /* Remove border */
        padding: 10px 20px;  /* Add padding */
        border-radius: 5px;  /* Rounded corners */
        cursor: pointer;  /* Pointer cursor on hover */
        font-size: 16px;  /* Larger font size */
        transition: background-color 0.3s ease;  /* Smooth transition for background color */
    }

    .login-btn:hover {
        background-color: #5096d0; /* Darker blue on hover */
    }
</style>