import { Flex, Layout } from "antd";
import { Content, Header } from "antd/es/layout/layout";
import styles from "./dashboard.module.css";
import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";
import { Protocol } from "pmtiles";
import maplibregl, { Marker } from "maplibre-gl";
import TripInfoCard from "../trip-info-card/trip-info-card";
import { vehicleSocket } from "../../services/vehicleSocket";
import { vehicleService } from "../../services/vehicleService";

interface Cart {
    name: string,
    speed: number,
    tripProgress: number,
    longLat: number[]
    long?: number,
    lat?: number,
    startLocation: string,
    endLocation: string
}

export default function Dashboard() {
    const map = useRef<maplibregl.Map | null>(null)
    const mapRef = useRef<HTMLDivElement | null>(null)
    const cartMarkers = useRef<{ [key: string]: Marker }>({})
    const [carts, setCarts] = useState<{ [key: number]: Cart }>([])

    function updateCart(id: number, data: Cart) {
        setCarts(
            {
                ...carts,
                [id]: {
                    ...carts[id],
                    ...data
                }
            }
        )
    }

    function addVehicle() {
        fetch("http://localhost:8002/api/vehicles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "James",
                speed: "12",
                long: 12,
                lat: 14,
                startLocation: "start",
                endLocation: "end",
            }),
        });

    }

    const vehicleSocketCallback = (data: any) => {
        console.log(data)
        updateCart(data.id, data)
    }

    // This will be replaced with real data when everything is hooked up
    // const cartsa = [
    //     {
    //         name: 'James',
    //         speed: 3,
    //         tripProgress: 75,
    //         longLat: [-78.863156, 38.433347],
    //         startLocation: 'Chesapeake Hall',
    //         endLocation: 'Front of King Hall'
    //     },
    //     {
    //         name: 'Madison',
    //         speed: 6,
    //         tripProgress: 20,
    //         longLat: [-78.860981, 38.431957],
    //         startLocation: 'E-Hall',
    //         endLocation: 'Festival'
    //     },
    // ]

    function focusCart(longLat: number[]) {
        if (map.current == undefined) return

        map.current.flyTo({
            center: [longLat[0], longLat[1]],
            zoom: 17,
        });
    }

    useEffect(() => {
        if (map.current != undefined || mapRef.current == undefined) return

        vehicleService.getVehicles().then((vehicles) => {
            console.log(vehicles);
            setCarts(vehicles as { [key: number]: Cart })
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

        map.current.on("load", async () => {
            if (map.current == undefined) return

            cartMarkers.current = {}

            Object.values(carts).forEach(cart => {
                const marker = new Marker()
                    .setLngLat([cart.longLat[0], cart.longLat[1]])
                    .addTo(map.current!);


                // .setPopup(popup)

                cartMarkers.current[cart.name] = marker
            })
        });


        return () => {
            vehicleSocket.unsubscribe(vehicleSocketCallback); // Cleanup on unmount
        };
    }, [])

    return (
        <Layout className={styles.dashboardContainer}>
            <Header>
                <Flex>
                    <h1 style={{ color: 'white' }}>JACart Dashboard</h1>
                    <button onClick={addVehicle}>Add Vehicle</button>
                </Flex>
            </Header>
            <Content>
                <Flex className={styles.fillHeight}>
                    <Flex className={styles.dashboardCards} vertical gap="middle" justify="flex-start">
                        {Object.values(carts).map((cart: Cart) => (
                            <TripInfoCard {...cart} doesNavToRoot={true} focusCartCallback={(longLat: number[]) => focusCart(longLat)} key={cart.name}></TripInfoCard>
                        ))}
                    </Flex>
                    <div ref={mapRef} id={styles.map}></div>
                </Flex>
            </Content>
        </Layout>
    )
}
