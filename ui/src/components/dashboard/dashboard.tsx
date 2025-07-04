import { Flex, Layout } from "antd";
import { Content, Header } from "antd/es/layout/layout";
import styles from "./dashboard.module.css";
import "maplibre-gl/dist/maplibre-gl.css";

import { lazy, useEffect, useRef, useState } from "react";
import { Protocol } from "pmtiles";
import maplibregl, { Marker } from "maplibre-gl";
import { vehicleSocket } from "../../services/vehicleSocket";
import { vehicleService } from "../../services/vehicleService";
import { Vehicle, VehicleMap } from "../../types";
import { Modal } from "antd"

const TripInfoCard = lazy(() => import("../trip-info-card/trip-info-card"));

function generateRandomLetters(length: number): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const randomLetters = [];

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * letters.length);
        randomLetters.push(letters[randomIndex]);
    }

    return randomLetters.join('');
}

export default function Dashboard() {
    const map = useRef<maplibregl.Map | null>(null)
    const mapRef = useRef<HTMLDivElement | null>(null)
    const cartMarkers = useRef<{ [key: string]: Marker }>({})
    const [carts, setCarts] = useState<VehicleMap>({})
    const [isModalOpen, setIsModalOpen] = useState(false); // State for additional info modal
    const [cartImage, setCartImage] = useState<string>('')
    const [selectedCart, setSelectedCart] = useState<string>("");

    const showModal = (cartName: string) => {
        setSelectedCart(cartName)
        setIsModalOpen(true);

        //FIXME maybe do a ref here or make it prettier
        vehicleSocket.subscribeCamera(cartName, (data: string) => setCartImage(data));
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        vehicleSocket.unsubscribeCamera(selectedCart);
        setSelectedCart("");
    };

    function updateCart(name: string, data: Vehicle) {
        setCarts(prevCarts => ({
            ...prevCarts,
            [name]: {
                ...prevCarts[name], // Merge existing cart data
                ...data
            }
        }));
    }

    function deleteCart(name: string) {
        setCarts(prevCarts => {
            const carts = { ...prevCarts };
            delete carts[name];
            return carts;
        });

        // removeMarker(name);
    }

    function addVehicle() {
        let longLat = [
            (Math.random() * 0.004) - 78.86,
            (Math.random() * 0.004) + 38.43
        ]

        fetch("https://35.153.174.48/api/vehicles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: generateRandomLetters(8),
                speed: Math.random() * 8,
                // long: (Math.random() * 0.004) - 78.86,
                // lat: (Math.random() * 0.004) + 38.43,
                longLat: longLat,
                startLocation: "Starting point",
                endLocation: "Ending point",
            }),
        });

    }

    const vehicleSocketCallback = (res: any) => {
        console.log("Update: ", res)
        if (res.deleted) {
            deleteCart(res.name);
        } else {
            updateCart(res.name, res.data)
        }
    }

    function focusCart(longLat: number[]) {
        if (map.current == undefined) return

        map.current.flyTo({
            center: [longLat[0], longLat[1]],
            zoom: 17,
        });
    }

    function addMarker(cart: Vehicle) {
        if (cart.longLat == undefined || cart.longLat.length < 2) return

        // Update existing marker if one exists
        if (!!cartMarkers.current[cart.name]) {
            cartMarkers.current[cart.name].setLngLat([cart.longLat[0], cart.longLat[1]]);
            return;
        }

        const customMarker = document.createElement("div");
        customMarker.style.width = "35px";
        customMarker.style.height = "35px";
        customMarker.style.background = "transparent";

        // Create an image element inside the div
        const image = document.createElement("img");
        image.src = '/images/golfcart.png';
        image.style.width = "100%";
        image.style.height = "100%";
        image.style.background = 'transparent';

        customMarker.appendChild(image);

        const marker = new Marker({ element: customMarker })
            .setLngLat([cart.longLat[0], cart.longLat[1]])
            .addTo(map.current!);

        cartMarkers.current[cart.name] = marker;
    }

    function removeMarker(name: string) {
        cartMarkers.current[name].remove();
        delete cartMarkers.current[name];
    }

    function handleModal(cart: Vehicle) {
        // setSelectedCart(cart.name);

        showModal(cart.name);
    }

    // Add or delete markers when carts list changes
    useEffect(() => {
        const cartNames = new Set<string>();

        // Add or update markers for each cart in list
        Object.values(carts).forEach(cart => {
            addMarker(cart)
            cartNames.add(cart.name)
        })

        // Remove any markers whose cooresponding carts are no longer in the list
        Object.keys(cartMarkers.current).forEach(marker => {
            if (!cartNames.has(marker)) removeMarker(marker);
        })
    }, [carts])

    useEffect(() => {
        // this needs to change even
        // const vehicles: VehicleMap = {
        //     "James": {
        //         name: 'James',
        //         speed: 3,
        //         tripProgress: 75,
        //         longLat: [-78.863156, 38.433347],
        //         startLocation: 'Chesapeake Hall',
        //         endLocation: 'Front of King Hall'
        //     },
        //     "Madison": {
        //         name: 'Madison',
        //         speed: 6,
        //         tripProgress: 20,
        //         longLat: [-78.860981, 38.431957],
        //         startLocation: 'E-Hall',
        //         endLocation: 'Festival'
        //     },
        // };

        // setCarts(vehicles)

        if (map.current != undefined || mapRef.current == undefined) return

        vehicleService.getVehicles().then((vehicles) => {
            console.log("Vehicles: ", vehicles);
            setCarts(vehicles as VehicleMap)
        })
        vehicleSocket.subscribe(vehicleSocketCallback);

        const protocol = new Protocol();
        maplibregl.addProtocol("pmtiles", protocol.tile);
        map.current = new maplibregl.Map({
            container: mapRef.current,
            style: "/basic_map.json",
            center: [-78.861814, 38.433129],
            zoom: 15,
        });

        const nav = new maplibregl.NavigationControl();
        map.current.addControl(nav, "top-left");

        // const locationPins: Marker[] = [];

        return () => {
            vehicleSocket.unsubscribe(vehicleSocketCallback); // Cleanup on unmount
        };
    }, [])

    return (
        <Layout className={styles.dashboardContainer}>
            <Header>
                <Flex justify="space-between" align="center">
                    <h1 style={{ color: 'white', whiteSpace: 'nowrap' }}>JACart Dashboard</h1>
                    {/* <button onClick={TESTshowCamera} className={styles.headerButton}>Subscribe Camera</button>
                    <button onClick={TESThideCamera} className={styles.headerButton}>Unsubscribe Camera</button> */}
                    <button onClick={addVehicle} className={styles.headerButton}>+ Add Vehicle</button>
                </Flex>
            </Header>
            <Content>
                <Flex className={`${styles.fillHeight} ${styles.dashboardContent}`}>
                    <Flex className={styles.dashboardCards} vertical gap="middle" justify="flex-start">
                        {Object.values(carts).map((cart: Vehicle) => (
                            <TripInfoCard cart={cart} doesNavToRoot={true} focusCartCallback={(longLat: number[]) => focusCart(longLat)} key={cart.name} onClick={(cart: Vehicle) => handleModal(cart)}></TripInfoCard>
                        ))}
                    </Flex>
                    <div ref={mapRef} id={styles.map} >
                        <Modal
                            title="Cart Details"
                            open={isModalOpen}
                            onCancel={handleCancel}
                            closable={false}
                            centered
                        >
                            <Flex vertical align="center">
                                <img style={{ width: '256px', aspectRatio: 1 }} src={cartImage}></img>
                            </Flex>
                        </Modal>
                    </div>

                </Flex>

            </Content>
        </Layout>



    )
}
