// Cart details mock data
const cartDetails = {
    "James": {
        battery: "80%",
        currentVideoLink: "https://example.com/james_video",
        gpsCoordinates: `38°26'00.3"N 78°51'41.9"W`,
        enRoute: true,
        destination: "E-Hall",
        tripCompletion: 45,
        currentPOI: "..Moving..",
        img: "james.png"
    },
    "Madison": {
        battery: "65%",
        currentVideoLink: "https://example.com/madison_video",
        gpsCoordinates: `38°25'57.7"N 78°51'36.1"W`,
        enRoute: false,
        destination: "N/A",
        tripCompletion: 0,
        currentPOI: "Festival",
        img: "madison.png"
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
        <p><strong>GPS Coordinates:</strong> ${cart.gpsCoordinates} (${cart.currentPOI})</p>
        <p><strong>En Route:</strong> ${cart.enRoute ? "YES" : "NO"}</p>
        ${cart.enRoute ? `<p><strong>Destination:</strong> ${cart.destination}</p>` : ''}
        ${cart.enRoute ? `<p><strong>Trip Completion:</strong> ${cart.tripCompletion}%</p>` : ''}
        <img src="${cart.img}" alt="image" width="750" height="400">
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
