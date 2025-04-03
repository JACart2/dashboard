
import { Button, Card, Flex, Progress } from "antd";
import clsx from "clsx";
import React from "react";
import { FaCarSide, FaLocationArrow, FaLocationCrosshairs, FaLocationDot, FaRightLong } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";

import styles from './trip-info-card.module.css'
import { Vehicle } from "../../types";

interface TripInfoProps {
    cart: Vehicle
    focusCartCallback?: (a: number[]) => void
    doesNavToRoot?: boolean
    img: string
}

export default function TripInfoCard({ cart, focusCartCallback, doesNavToRoot, img }: TripInfoProps) {
    const navigate = useNavigate();


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

    function navToRoot(): void {
        if (doesNavToRoot) {
            navigate('/');
        }
    }

    function getSpeedLabel() {
        return (<span style={{ fontSize: '14pt' }}>
            {cart.speed == undefined ? 'N/A' : `${Math.round(cart.speed * 100) / 100} mph`}
        </span>)
    }

    return (
        <Card className={clsx(styles.tripInfoCard, { [styles.showHover]: doesNavToRoot })} onClick={() => navToRoot()} title={
            // Card title (icon, name, locate button)
            <Flex className={styles.cardTitle} justify="space-between">
                <Flex className={styles.cardTitle}><FaCarSide /> <span>{cart.name}</span></Flex>
                {!!cart.longLat &&
                    <Button className={styles.cartLocateButton} onClick={($event) => emitFocusCart($event)} icon={<FaLocationCrosshairs />} shape="circle"></Button>
                }
            </Flex>
        }>
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

                <img src={img}></img>
            </Flex>
        </Card>
    );

}
