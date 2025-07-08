
import { Button, Card, Flex, Progress } from "antd";
import clsx from "clsx";
import React from "react";
import { FaCarSide, FaLocationArrow, FaLocationCrosshairs, FaLocationDot, FaRightLong, FaTrash } from "react-icons/fa6";
// import { useNavigate } from "react-router-dom";

import styles from './trip-info-card.module.css'
import { Vehicle } from "../../types";
import { vehicleService } from "../../services/vehicleService";

interface TripInfoProps {
    cart: Vehicle
    focusCartCallback?: (a: number[]) => void
    doesNavToRoot?: boolean
    onClick: (arg0: Vehicle) => void;
}

export default function TripInfoCard({ cart, focusCartCallback, doesNavToRoot, onClick }: TripInfoProps) {
    // const navigate = useNavigate();


    function speedToPercent(speed?: number) {
        speed = speed ?? 0;
        const max = 8;
        return (Math.min(Math.max(0, speed), max) / max) * 100;
    }

    function emitFocusCart(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        if (focusCartCallback == undefined || cart.longLat == undefined) return;

        focusCartCallback(cart.longLat);
    }

    function getSpeedLabel() {
        return (<span style={{ fontSize: '14pt' }}>
            {cart.speed == undefined ? 'N/A' : `${Math.round(cart.speed * 100) / 100} mph`}
        </span>)
    }

    function deleteCart(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        return vehicleService.deleteVehicle(cart.name);
    }

    return (
        <Card className={clsx(styles.tripInfoCard, styles.helpRequested, { [styles.showHover]: doesNavToRoot })} onClick={() => onClick(cart)} title={
            // Card title (icon, name, locate button)
            <Flex className={styles.cardTitle} justify="space-between">
                <Flex className={styles.cardTitle}>
                    <FaCarSide />
                    <span className={styles.cartName}>{cart.name}</span>
                </Flex>

                <Flex gap="8px">
                    {!!cart.longLat &&
                        <Button className={styles.cardTitleButton} onClick={($event) => emitFocusCart($event)} icon={<FaLocationCrosshairs />} shape="circle"></Button>
                    }

                    { /* Delete button may not be needed once carts are auto removed after inactivity, but still useful for now while under development */}
                    <Button className={styles.cardTitleButton} onClick={($event) => deleteCart($event)} icon={<FaTrash />} variant="filled" danger shape="circle"></Button>
                </Flex>
            </Flex>
        }>
            <div className={styles.cardAlert}>Help Requested</div>
            <Flex vertical gap="large">
                <div>
                    <span style={{ fontWeight: 'bold' }}>Trip Progress</span>
                    <Progress type="line" percent={cart.tripProgress} />

                    {!!cart.startLocation && !!cart.endLocation &&
                        <Flex align="center" style={{ gap: '4px' }}>
                            <FaLocationArrow color="blue" />
                            <span>{cart.startLocation}</span>
                            <FaRightLong style={{ margin: '0 8px', opacity: 0.6 }} />
                            <FaLocationDot color="#E04A3A" />
                            <span>{cart.endLocation}</span>
                        </Flex>
                    }
                </div>

                <Progress type="dashboard" percent={speedToPercent(cart.speed)} style={{ margin: '0 auto' }} status="normal"
                    format={() => getSpeedLabel()} />
            </Flex>
        </Card>
    );

}
