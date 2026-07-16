import { Flex, Layout } from "antd";
import { Content, Header } from "antd/es/layout/layout";
import styles from "./dashboard.module.css";
import "maplibre-gl/dist/maplibre-gl.css";
import CartDetailModal from "../cart-detail-modal/cart-detail-modal";

import { lazy, useEffect, useRef, useState } from "react";
import { Protocol } from "pmtiles";
import maplibregl, { Marker } from "maplibre-gl";
import { vehicleSocket } from "../../services/vehicleSocket";
import { vehicleService } from "../../services/vehicleService";
import { Vehicle, VehicleMap, DashboardAIDecision } from "../../types";

const TripInfoCard = lazy(() => import("../trip-info-card/trip-info-card"));

export default function Dashboard() {
    const map = useRef<maplibregl.Map | null>(null)
    const mapRef = useRef<HTMLDivElement | null>(null)
    const cartMarkers = useRef<{ [key: string]: Marker }>({})
    const activeCameraCart = useRef<string | null>(null);
    const [carts, setCarts] = useState<VehicleMap>({})
    const [sortedCarts, setSortedCarts] = useState<Vehicle[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false); // State for additional info modal
    const [cartImages, setCartImages] = useState<{
        front?: string;
        rear?: string;
    }>({});
    const [selectedCart, setSelectedCart] = useState<Vehicle | undefined>(undefined);

    const selectedCartData = selectedCart
        ? carts[selectedCart.name] ?? selectedCart
        : undefined;

    const showModal = (cart: Vehicle) => {
        console.log("[Dashboard] opening modal for cart:", cart);

        if (activeCameraCart.current && activeCameraCart.current !== cart.name) {
            vehicleSocket.unsubscribeCamera(activeCameraCart.current, "front");
            vehicleSocket.unsubscribeCamera(activeCameraCart.current, "rear");
        }

        activeCameraCart.current = cart.name;

        setCartImages({});
        setSelectedCart(cart);
        setIsModalOpen(true);

        // console.log("[Camera] subscribing to cart cameras:", cart.name);

        vehicleSocket.subscribeCamera(cart.name, "front", (data: string) => {
            // console.log("[Camera] received front frame:", data.length);
            setCartImages((prev) => ({
                ...prev,
                front: data,
            }));
        });

        vehicleSocket.subscribeCamera(cart.name, "rear", (data: string) => {
            console.log("[Camera] received rear frame:", data.length);
            setCartImages((prev) => ({
                ...prev,
                rear: data,
            }));
        });
    };

    const handleCancel = () => {
        setIsModalOpen(false);

        if (activeCameraCart.current) {
            vehicleSocket.unsubscribeCamera(activeCameraCart.current, "front");
            vehicleSocket.unsubscribeCamera(activeCameraCart.current, "rear");
            activeCameraCart.current = null;
        }

        setSelectedCart(undefined);
        setCartImages({});
    };

    const dashboardAIDecisionCallback = (
    incomingDecision: DashboardAIDecision,
) => {
    console.log(
        "[Dashboard] dashboard AI decision received:",
        incomingDecision,
    );

    const decisionCartName =
        typeof incomingDecision.cartName === "string"
            ? incomingDecision.cartName
            : "";

    if (!decisionCartName.trim()) {
        console.warn(
            "[Dashboard] Ignoring dashboard AI decision without cartName:",
            incomingDecision,
        );

        return;
    }

    setCarts((previousCarts) => {
        const matchingCartName = Object.keys(previousCarts).find(
            (name) =>
                name.trim().toLowerCase() ===
                decisionCartName.trim().toLowerCase(),
        );

        if (!matchingCartName) {
            console.warn(
                "[Dashboard] No matching cart for dashboard AI decision:",
                decisionCartName,
            );

            return previousCarts;
        }

        const cart = previousCarts[matchingCartName];

        return {
            ...previousCarts,
            [matchingCartName]: {
                ...cart,
                dashboardAIDecisions: [
                    {
                        ...incomingDecision,
                        cartName: decisionCartName,
                    },
                    ...(cart.dashboardAIDecisions ?? []),
                ].slice(0, 100),
            },
        };
    });
    };

    function updateCart(name: string, data: Vehicle) {
        setCarts((previousCarts) => {
            const existingCart = previousCarts[name];

            const existingAAD = existingCart?.anomalyResult ?? [];
            const incomingAAD = data.anomalyResult ?? [];

            const mergedAAD = [
                ...incomingAAD,
                ...existingAAD,
            ]
                .filter(
                    (alert, index, alerts) =>
                        alerts.findIndex(
                            (candidate) =>
                                candidate.timestamp === alert.timestamp &&
                                candidate.message === alert.message
                        ) === index
                )
                .sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                )
                .slice(0, 100);

            const existingLogs = existingCart?.logs ?? [];
            const incomingLogs = data.logs ?? [];

            const mergedLogs = [
                ...incomingLogs,
                ...existingLogs,
            ]
                .filter(
                    (log, index, logs) =>
                        logs.findIndex(
                            (candidate) =>
                                candidate.timestamp === log.timestamp &&
                                candidate.message === log.message &&
                                candidate.source === log.source
                        ) === index
                )
                .sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                )
                .slice(0, 500);

            return {
                ...previousCarts,
                [name]: {
                    ...existingCart,
                    ...data,

                    anomalyResult: mergedAAD,

                    // These histories are managed separately.
                    dashboardAIDecisions:
                        existingCart?.dashboardAIDecisions ?? [],

                    logs: mergedLogs,
                },
            };
        });
    }

    function deleteCart(name: string) {
        setCarts(prevCarts => {
            const carts = { ...prevCarts };
            delete carts[name];
            return carts;
        });

        // removeMarker(name);
    }

    const vehicleSocketCallback = (res: any) => {
        console.log("[Vehicle Socket Update]:", res);

        if (res?.data?.logs) {
            console.log("[Dashboard Logs Update]:", {
                name: res.name,
                logCount: res.data.logs.length,
                latestLog: res.data.logs[0],
            });
        }

        if (res?.data?.aiLogSummary) {
            console.log("[Dashboard AI Summary Update]:", {
                name: res.name,
                aiLogSummary: res.data.aiLogSummary,
            });
        }

        if (res.deleted) {
            deleteCart(res.name);
        } else {
            updateCart(res.name, res.data);
        }
    };

    function focusCart(longLat: number[]) {
        if (map.current == undefined) return

        map.current.flyTo({
            center: [longLat[0], longLat[1]],
            zoom: 17,
        });
    }

    function addVehicle() {
        vehicleService.createTestVehicle();
    }

    function addMarker(cart: Vehicle) {
        if (!cart.longLat || cart.longLat.length < 2) return;

        const existingMarker = cartMarkers.current[cart.name];

        if (existingMarker) {
            existingMarker.setLngLat([
                cart.longLat[0],
                cart.longLat[1],
            ]);
            return;
        }

        const customMarker = document.createElement("div");
        customMarker.className = styles.cartMarker;
        customMarker.title = cart.name;
        customMarker.setAttribute(
            "aria-label",
            `${cart.name} cart location`
        );

        const label = document.createElement("div");
        label.className = styles.cartMarkerLabel;
        label.textContent = cart.name;

        const image = document.createElement("img");
        image.className = styles.cartMarkerImage;
        image.src = "/images/golfcart.png";
        image.alt = `${cart.name} cart`;
        image.draggable = false;

        customMarker.appendChild(label);
        customMarker.appendChild(image);

        const marker = new Marker({
            element: customMarker,
            anchor: "bottom",
        })
            .setLngLat([
                cart.longLat[0],
                cart.longLat[1],
            ])
            .addTo(map.current!);

        cartMarkers.current[cart.name] = marker;
    }

    function removeMarker(name: string) {
        cartMarkers.current[name].remove();
        delete cartMarkers.current[name];
    }

    function handleModal(cart: Vehicle) {
        console.log("[Dashboard] card clicked:", cart);
        showModal(cart);
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

            if (Array.isArray(vehicles)) {
                const vehicleMap = vehicles.reduce((acc, vehicle) => {
                    acc[vehicle.name] = vehicle;
                    return acc;
                }, {} as VehicleMap);

                setCarts(vehicleMap);
            } else {
                setCarts(vehicles as VehicleMap);
            }
        });
            vehicleSocket.subscribe(vehicleSocketCallback);
            vehicleSocket.subscribeDashboardAIDecisions(dashboardAIDecisionCallback);

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
        vehicleSocket.unsubscribe(vehicleSocketCallback);
        vehicleSocket.unsubscribeDashboardAIDecisions(dashboardAIDecisionCallback);

        if (activeCameraCart.current) {
            vehicleSocket.unsubscribeCamera(activeCameraCart.current, "front");
            vehicleSocket.unsubscribeCamera(activeCameraCart.current, "rear");
            activeCameraCart.current = null;
        }
    };

    }, [])

    // Ensure that carts with help requests are shown first in list
    useEffect(() => {
        const helpRequested: Vehicle[] = [];
        const noAlerts: Vehicle[] = [];

        Object.values(carts).forEach(cart => {
            if (!!cart.helpRequested) helpRequested.push(cart);
            else noAlerts.push(cart);
        });

        setSortedCarts([...helpRequested, ...noAlerts]);
    }, [carts]);

    console.log("[Dashboard render]", {
        isModalOpen,
        selectedCart,
        selectedCartData,
    });
    
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
                    <Flex
                    className={styles.dashboardCards}
                    vertical
                    gap="middle"
                    justify="flex-start"
                    >
                    {sortedCarts.map((cart: Vehicle) => (
                        <TripInfoCard
                        cart={cart}
                        doesNavToRoot={true}
                        focusCartCallback={(longLat: number[]) => focusCart(longLat)}
                        key={cart.name}
                        onClick={() => handleModal(cart)}
                        />
                    ))}
                    </Flex>

                    <div ref={mapRef} id={styles.map} />
                </Flex>

                    <CartDetailModal
                        open={isModalOpen}
                        onClose={handleCancel}
                        cart={selectedCartData}
                        cartImages={cartImages}
                    />
            </Content>
        </Layout>



    )
}
