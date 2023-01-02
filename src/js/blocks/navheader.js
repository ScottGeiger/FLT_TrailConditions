import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
import { Nav, Row, Col } from "react-bootstrap";
import { Link } from "react-scroll";
import { Icon } from '@iconify/react';

export default function NavHeader({mapNotices,noticeFilters,headerRef}) {
    const [offset,setOffset] = useState(0);
    const navRef = useRef();

    //TODO: Move to mapNotices object build above
    const getClassName = useCallback(i => {
        if (!mapNotices) return '';
        const disabled = isDisabled(i);
        let cName = 'text-secondary';
        if (mapNotices[i].active_notices > 0) cName = 'text-primary';
        if (mapNotices[i].active_closures > 0) cName = 'text-danger';
        if (disabled) cName = "";
        cName += ' py-0 px-1';
        return cName;
    },[mapNotices]);

    const isDisabled = useCallback(i => {
        return (noticeFilters.showMap.type=='non-map' && !mapNotices[i].display_count)?true:!mapNotices[i].show;
    },[mapNotices,noticeFilters]);

    useEffect(() => {
        if (!headerRef.current) return;
        const offset = (headerRef.current.offsetHeight+50)*-1;
        setOffset(offset);
    },[headerRef]);
    useLayoutEffect(()=> {
        document.querySelectorAll('#sticky-header .nav .highlight').forEach(el=>el.classList.remove('highlight'));
    },[noticeFilters]);
    return (
        <section className="border rounded px-2 py-1 mb-2 d-none d-sm-none d-md-block">
            <Row className="mb-0">
                <Col className="d-flex flex-row align-items-center mb-1">
                    <h3 className="mb-0">Navigation</h3>
                    <p className="mb-0 p-2 pb-1">Key:</p>
                    <p className="mb-0 px-2 py-1"><span className="badge text-bg-danger">Active Closure</span></p>
                    <p className="mb-0 px-2 py-1"><span className="badge text-bg-primary">Active Notice</span></p>
                    <p className="mb-0 px-2 py-1"><span className="badge text-bg-secondary">No Active Notices</span></p>
                </Col>
            </Row>
            <Nav ref={navRef}>
                {mapNotices.map((m,i) => (
                    <Nav.Item key={m.tm_id}>
                        <Nav.Link as={Link} href={`#${m.tm_name}`} to={`${m.tm_name}`} className={getClassName(i)} activeClass="highlight" smooth={true} spy={true} hashSpy={true} delay={0} duration={2000} offset={offset} disabled={isDisabled(i)}>{m.tm_name}</Nav.Link>
                    </Nav.Item>
                ))}
            </Nav>
        </section>
    );
}
