import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { onlineManager } from '@tanstack/react-query';
import { format } from "date-fns";
import { Container, Nav, Row, Col, Form, Alert } from "react-bootstrap";
import { useMapQueries } from "./queries";
import { useLocation, useSearchParams } from "react-router-dom";
import { groupBy, orderBy, snakeCase, camelCase } from "lodash";
import { Link, scroller } from "react-scroll";
import htmr from "htmr";
import { Icon } from '@iconify/react';

const FormatDate = React.memo(({fmt,children}) => {
    const dt = (!children)?new Date():new Date(children*1000);
    return (!fmt)?format(dt,'PP'):format(dt,fmt);
});


export default function App() {
    const [searchParams,setSearchParams] = useSearchParams();

    const [showMap,setShowMap] = useState('');
    const [filterNotices,setFilterNotices] = useState('');
    const [showArchived,setShowArchived] = useState(false);
    const [sortBy,setSortBy] = useState('map');
    const [displayTotal,setDisplayTotal] = useState(0);
    const headerRef = useRef();

    const isOnline = onlineManager.isOnline();
    const {getMaps,getNotices} = useMapQueries();
    const maps = getMaps();
    const notices = getNotices({enabled:!!maps.data});

    //reducer? or callback?
    const handleChangeFilter = e => {
        console.log(e);
        console.log(e.target.options[e.target.options.selectedIndex]);
        const type = e.target.options[e.target.options.selectedIndex].dataset?.type;
        if (type == 'map') {
            setShowMap(e.target.value);
            setFilterNotices('');
        } else {
            setShowMap('');
            setFilterNotices(e.target.value);
        }
    }

    const mapNotices = useMemo(() => {
        if (!maps.data||!notices.data) return [];

        const now = Date.now()/1000;
        const m = new Map(maps.data.map(m=>{return [m.tm_id,m.tm_name];}));

        function process_notice(notice) {
            notice.expired = notice.tn_Expire<now;

            notice.mapName = m.get(notice.tn_tmid);
            notice.tn_Closure = notice.tn_Closure.trim();

            let notice_type = "";
            if (notice.tn_Closure != "") notice_type = "Non-Hunting Closure";
            if (notice.tn_Hunting == "1") notice_type = "Hunting Closure";
            if (notice.tn_tempNotice == "1") notice_type = "Temporary Notice";
            if (notice.tn_RevNotice == "1") notice_type = "Map Revision";
            notice.notice_type = notice_type;

            notice.is_closure = (notice_type && !(notice.tn_tempNotice=="1"||notice.tn_RevNotice=="1"));

            let closure_text = notice.tn_Closure;
            if (notice.tn_Hunting == "1" && !closure_text) closure_text = "Hunting Closure";
            if (notice.tn_tempNotice == "1" && !closure_text) closure_text = "Temporary Notice";
            if (notice.tn_RevNotice == "1") closure_text = "Map Revision";
            notice.closure_text = closure_text;

            let s = (!notice.expired||(notice.expired&&showArchived));
            let show = false;
            if (filterNotices && s) {
                //if (filterNotices == 'all_closures' && notice_type && notice_type != 'Map Revision') show = true;
                if (filterNotices == 'all_closures' && notice.is_closure) show = true;
                if (filterNotices == 'hunting_closures' && notice_type == 'Hunting Closure') show = true;
                if (filterNotices == 'nonhunting_closures' && notice_type == 'Non-Hunting Closure') show = true;
                if (filterNotices == 'map_revisions' && notice_type == 'Map Revision') show = true;
                if (filterNotices == 'temp_notices' && notice_type == 'Temporary Notice') show = true;    
            } else {
                show = s;
            }
            notice.show = show;

            return notice;
        }

        if (sortBy == 'map') {
            const tn = groupBy(orderBy(notices.data,['tn_Date'],['desc']),'tn_tmid');
            const tm = [];
            maps.data.forEach(m => {
                let show = (showMap)?(m.tm_id==showMap):true;
                let active_notices = 0;
                let active_closures = 0;
                let total_notices = 0;//do we need this?
                let display_count = 0;
                tn[m.tm_id]?.forEach(n => {
                    process_notice(n);
                    if (!n.expired && n.is_closure) active_closures++;
                    if (!n.expired) active_notices++;
                    if (n.show) display_count++;
                    total_notices++;
                });
                tm.push({
                    ...m,
                    show:show,
                    mapNameSC:snakeCase(m.tm_name),
                    mapNameCC:camelCase(m.tm_name),
                    active_notices:active_notices,
                    active_closures:active_closures,
                    total_notices:total_notices,
                    display_count:display_count,
                    notices:tn[m.tm_id]
                });
            });
            console.log(tm);
            setDisplayTotal(tm.map(m=>m.display_count).reduce((a,b)=>a+b));
            return tm;
        } else {
            const tn = orderBy(notices.data,['tn_Date'],['desc']);            
            tn.forEach(process_notice);
            console.log(tn);
            return tn;
        }
    },[maps.data,notices.data,showMap,filterNotices,showArchived,sortBy]);

    useEffect(()=>{
        setSortBy(searchParams.get('sortBy')=='date'?'date':'map');
        setShowArchived(searchParams.get('archive')=='old');
        searchParams.get('show')&&setShowMap(searchParams.get('show'));
    },[searchParams]);
    useEffect(() => {
        if (!mapNotices||!headerRef.current) return;
        if (window.location.hash) {
            console.log(window.location);
            const offset = (headerRef.current.offsetHeight+10)*-1;
            scroller.scrollTo(snakeCase(window.location.hash.slice(1,)),{duration:1500,smooth:'easeInOutQuad',delay:0,offset:offset});
        }
    },[window.location,mapNotices,headerRef]);
    return (
        <Container as="main" className="mt-3" fluid>
            {(maps.isLoading||notices.isLoading) && <Loading/>}
            {((maps.isError||notices.isError)&&isOnline) && <LoadingError/>}
            {(maps.data&&notices.data) && 
                <>
                    <div ref={headerRef} id="sticky-header">
                        {sortBy=='map' && <NavHeader mapNotices={mapNotices} filterNotices={filterNotices} headerRef={headerRef}/>}
                        <NoticeFilter maps={maps.data} handleChangeFilter={handleChangeFilter} sortBy={sortBy} setSortBy={setSortBy} showArchived={showArchived} setShowArchived={setShowArchived}/>
                    </div>
                    <Row className="mx-2 mb-1">
                        <Col className="p-0 text-end">Notices Displayed: {displayTotal}</Col>
                    </Row>
                    <Notices mapNotices={mapNotices} filterNotices={filterNotices} sortBy={sortBy} headerRef={headerRef}/>
                </>
            }
        </Container>
    );
}

function Loading() {
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

function LoadingError() {
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

function NavHeader({mapNotices,filterNotices,headerRef}) {
    const [offset,setOffset] = useState(0);

    const calculateDuration = d => {
        console.log(d);
        return Math.abs(d);
    }

    //Move to mapNotices object build above? yes
    const getClassName = useCallback(i => {
        if (!mapNotices) return '';
        const disabled = isDisabled(i);
        let cName = 'text-secondary';
        if (mapNotices[i].active_notices > 0) cName = 'text-primary';
        if (mapNotices[i].active_closures > 0) cName = 'text-danger';
        if (disabled) cName = "";
        cName += ' p-1';
        return cName;
    },[mapNotices]);

    const isDisabled = useCallback(i => {
        return (filterNotices && !mapNotices[i].display_count)?true:!mapNotices[i].show;
    },[mapNotices,filterNotices]);

    useEffect(()=>{
        if (!headerRef.current) return;
        setOffset(((headerRef.current.offsetHeight||0)+10)*-1);
    },[headerRef]);
    return (
        <section className="border rounded p-2 my-3 d-none d-sm-none d-md-block">
            <Row>
                <Col className="d-flex flex-row align-items-center">
                    <h3 className="mb-0">Navigation</h3>
                    <p className="mb-0 p-2 pb-1">Key:</p>
                    <p className="mb-0 px-2 py-1"><span className="badge text-bg-danger">Active Closure</span></p>
                    <p className="mb-0 px-2 py-1"><span className="badge text-bg-primary">Active Notice</span></p>
                    <p className="mb-0 px-2 py-1"><span className="badge text-bg-secondary">No Active Notices</span></p>
                </Col>
            </Row>
            <Nav>
                {mapNotices.map((m,i) => (
                    <Nav.Item key={m.tm_id}>
                        <Nav.Link as={Link} href={`#${m.tm_name}`} to={`${m.tm_name}`} className={getClassName(i)} activeClass="active" smooth={true} spy={true} hashSpy={true} delay={0} duration={2000} offset={offset} disabled={isDisabled(i)}>{m.tm_name}</Nav.Link>
                    </Nav.Item>
                ))}
            </Nav>
        </section>
    );
}

function NoticeFilter({maps,handleChangeFilter,sortBy,setSortBy,showArchived,setShowArchived}) {
    return (
        <section className="border rounded p-2 my-3">
            <Form>
                <div className="d-flex justify-content-between">
                    <Form.Group as={Row} className="d-flex align-items-center">
                        <Form.Label column xs="auto">Show: </Form.Label>
                        <Col xs="auto">
                            <Form.Select aria-label="Show only selected" onChange={handleChangeFilter} disabled={sortBy=='date'}>
                                <option value="">All Notices</option>
                                <option data-type="non-map" value="all_closures">All Closures</option>
                                <option data-type="non-map" value="hunting_closures">Hunting Closures</option>
                                <option data-type="non-map" value="nonhunting_closures">Non-Hunting Closures</option>
                                <option data-type="non-map" value="map_revisions">Map Revisions</option>
                                <option data-type="non-map" value="temp_notices">Temporary Notices</option>
                                <option disabled value="">-----</option>
                                {maps.map(m=><option key={m.tm_id} data-type="map" value={m.tm_id}>{m.tm_name}</option>)}
                            </Form.Select>
                        </Col>
                        <Col xs="auto">
                            <Form.Check type="switch" id="showArchived" label="Archived" checked={showArchived} onChange={()=>setShowArchived(!showArchived)}/>
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="d-flex align-items-center">
                        <Form.Label column xs="auto">Sort By: </Form.Label>
                        <Col xs="auto">
                            <Form.Check type="radio" name="radioShow" label="Map" value="map" inline checked={sortBy=='map'} onChange={e=>setSortBy('map')}/>
                            <Form.Check type="radio" name="radioShow" label="Date" value="date" inline checked={sortBy=='date'} onChange={e=>setSortBy('date')}/>
                        </Col>
                    </Form.Group>
                </div>
            </Form>
        </section>
    );
}

function Notices({mapNotices,filterNotices,sortBy,headerRef}) {
    const location = useLocation();
    return (
        <section id="notice-grid" className="border rounded mb-5">
            {sortBy=='map' && mapNotices.map(m => {
                if (!m.show) return null;
                if (filterNotices && !m.notices?.some(n=>n.show)) return null;
                return (
                    <section key={m.tm_id} id={m.mapNameSC} name={m.tm_name} className="mt-2">
                        <NoticeHeader map={m}/>
                        <NoticeDetails notices={m.notices}/>
                    </section>
                );
            })}
            {sortBy=='date' && <NoticeDetails notices={mapNotices}/>}
        </section>
    )
}

function NoticeHeader({map}) {
    return (
        <header className="mx-2 p-2 rounded-top">
            <Row>
                <Col xs={12} className="text-center">{map.tm_name}{map.tm_location && <small> - {map.tm_location}</small>}</Col>
            </Row>
            <Row>
                <Col xs={6}>Revised: <FormatDate>{map.tm_revision}</FormatDate></Col>
                <Col xs={6} className="text-end">Count: {map.display_count}</Col>
            </Row>
        </header>
    );
}

function NoticeDetails({notices}) {
    return (
        <>
            {notices && !notices.some(n=>n.show) && 
                <Row as="article" className="mx-2 bg-secondary bg-opacity-50">
                    <Col xs={12} className="border border-top-0 border-secondary p-2 text-center fst-italic">
                        <p className="mb-0">No Notices</p>
                    </Col>
                </Row>
            }
            {notices && notices.map(n => {
                if (!n.show) return null;
                let cName = "mx-2";
                if (n.tn_RevNotice!="0") cName += " bg-danger bg-opacity-50";
                if (n.expired) cName += " bg-secondary bg-opacity-50 expired";
                return (
                    <Row key={n.tn_id} as="article" id={`notice_id-${n.tn_id}`} className={cName}>
                        <Col md={3} className="border border-top-0 border-secondary p-2">
                            <p className="mb-0 fw-bold">{n.mapName}</p>
                            <p className="mb-0"><FormatDate>{n.tn_Date}</FormatDate></p>
                            {n.notice_type && <p className="mb-0 text-danger"><strong>{n.tn_tempNotice=="1"&&<Icon icon="mdi:alert"/>}{n.notice_type}</strong></p>}
                            {n.expired && <p className="mb-0 text-danger"><strong>EXPIRED!</strong></p>}
                        </Col>
                        <Col md={9} className="border border-top-0 border-secondary p-2">
                            {n.closure_text && <p className="text-danger"><strong>{n.tn_tempNotice=="1"&&<Icon icon="mdi:alert"/>}{n.closure_text}</strong></p>}
                            <NoticeBody notice={n}/>
                        </Col>
                    </Row>
                );
            })}
        </>
    );
}

//make callback or memoize?
function NoticeBody({notice}) {
    const parseHTML = () => {
        let html = null
        try {
            html = htmr(notice.tn_Notice);
        } catch {
            const msg = `Unabled to display Notice - Invalid HTML (id:${notice.tn_id},map:${notice.mapName})`;
            console.error(msg);
            html = <p className="text-danger mb-0">{msg}</p>;
        }
        return html;
    }
    return parseHTML();
}
