// Cart details mock data
const cartDetails = {
    "James": {
        battery: "80%",
        currentVideoLink: "https://example.com/james_video",
        gpsCoordinates: "37.7749° N, 122.4194° W",
        enRoute: true,
        destination: "San Francisco",
        tripCompletion: 45
    },
    "Madison": {
        battery: "65%",
        currentVideoLink: "https://example.com/madison_video",
        gpsCoordinates: "34.0522° N, 118.2437° W",
        enRoute: false,
        destination: "N/A",
        tripCompletion: 0
    }
};

// Open cart details page
function openCartDetails(cartName) {
    const detailsContainer = document.getElementById("cartDetails");
    const cartNameElem = document.getElementById("cartName");
    const cartInfoElem = document.getElementById("cartInfo");

    cartNameElem.innerText = `${cartName}'s Details`;
    const cart = cartDetails[cartName];

    cartInfoElem.innerHTML = `
        <p><strong>Battery:</strong> ${cart.battery}</p>
        <p><strong>Current Video:</strong> <a href="${cart.currentVideoLink}" target="_blank">Watch</a></p>
        <p><strong>GPS Coordinates:</strong> ${cart.gpsCoordinates}</p>
        <p><strong>En Route:</strong> ${cart.enRoute ? "YES" : "NO"}</p>
        ${cart.enRoute ? `<p><strong>Destination:</strong> ${cart.destination}</p>` : ''}
        ${cart.enRoute ? `<p><strong>Trip Completion:</strong> ${cart.tripCompletion}%</p>` : ''}
    `;

    detailsContainer.style.display = 'block';
    document.querySelector('.container').style.display = 'none';
}

// Go back to the list of active carts
function goBack() {
    const detailsContainer = document.getElementById("cartDetails");
    detailsContainer.style.display = 'none';
    document.querySelector('.container').style.display = 'block';
}
