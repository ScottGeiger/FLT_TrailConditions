import React from "react";
import { Row, Col, Alert } from "react-bootstrap";
import { Icon } from "@iconify/react";

export function Loading() {
    return (
        <Row>
            <Col>
                <Alert variant="secondary">
                    <div className="d-flex flex-row justify-content-center align-items-center">
                        <div className="p-2">
                            <div className="spinner-border" role="status"></div>
                        </div>
                        <div className="p-2">
                            <p className="mb-0">Loading Notices...</p>
                        </div>
                    </div>
                </Alert>
            </Col>
        </Row>
    );
}

export function LoadingError() {
    return (
        <Row>
            <Col>
                <Alert variant="danger">
                    <div className="d-flex flex-row justify-content-center align-items-center">
                        <div className="p-1">
                            <Icon icon="akar-icons:triangle-alert" width="30" height="30"/>
                        </div>
                        <div className="p-1">
                            <p className="mb-0">Error Loading Notices</p>
                        </div>
                    </div>
                </Alert>
            </Col>
        </Row>
    );
}