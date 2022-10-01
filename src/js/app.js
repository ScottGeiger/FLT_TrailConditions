import React, { useEffect, useState, useMemo, useRef, useCallback, useReducer } from "react";
import { onlineManager } from '@tanstack/react-query';
import { format } from "date-fns";
import { Container, Nav, Row, Col, Form, Button } from "react-bootstrap";
import { useMapQueries } from "./queries";
import { useSearchParams } from "react-router-dom";
import { groupBy, orderBy, snakeCase, startCase } from "lodash";
import { Link, scroller } from "react-scroll";
import htmr from "htmr";
import { Icon } from '@iconify/react';
import { Loading, LoadingError } from "./utils";

const mailtoBody = 'For the latest information about trail conditions visit https://fingerlakestrail.org/trailconditions';

const nonMapList = [
    {name:'closure',title:'All Closures'},
    {name:'hunting',title:'Hunting Closures'},
    {name:'non-hunting',title:'Non-Hunting Closures'},
    {name:'rev-notice',title:'Map Revisions'},
    {name:'temp-notice',title:'Temporary Notices'}
];

const title = 'Trail Condition Notices';

const FormatDate = React.memo(({fmt,children}) => {
    const dt = (!children)?new Date():new Date(children*1000);
    return (!fmt)?format(dt,'PP'):format(dt,fmt);
});

export default function App() {
    const [searchParams,setSearchParams] = useSearchParams();

    const [displayTotal,setDisplayTotal] = useState(0);
    const headerRef = useRef();

    const isOnline = onlineManager.isOnline();
    const {getSession,getMaps,getNotices} = useMapQueries();
    const session = getSession({onSuccess:d => setNoticeFilters({isAdmin:!!d?.login_array?.aid})});
    const maps = getMaps();
    const notices = getNotices({enabled:!!maps.data});

    const [noticeFilters,setNoticeFilters] = useReducer((state,action) => {
        const key = Object.keys(action).at(0);
        const val = Object.values(action).at(0);
        const obj = {...state};
        if (obj.hasOwnProperty(key)) obj[key] = val;
        if (obj.showMap.name && !obj.showMap.map) {
            if (maps.data) {
                const lmap = maps.data.find(m=>m.tm_name.replaceAll('/','_')==obj.showMap.name.replaceAll('/','_'));
                if (lmap) {
                    obj.showMap = {type:'map',map:lmap.tm_id,name:lmap.tm_name,title:lmap.tm_name};
                } else {
                    const nonmap = nonMapList.find(nm=>nm.name==obj.showMap.name);
                    if (nonmap) obj.showMap = {type:'non-map',map:nonmap.name,name:nonmap.name,title:nonmap.title};
                }
            }
        }

        // set location history
        let params = new URLSearchParams();
        let subtitle = '';
        if (obj.showMap.map) {
            params.set('show',obj.showMap.name.replaceAll('/','_'));
            subtitle = obj.showMap.title;
        } else {
            params.set('sortBy',obj.sortBy);
            params.set('archive',(!obj.archive)?'new':'old');
            subtitle = `Sorted By ${startCase(obj.sortBy)}`;
            if (obj.archive) subtitle += ' [Archived]';
        }
        if (obj.hideNav) params.set('hidenav',obj.hideNav);
        let url = '?'+params.toString();
        if (obj.sortBy=='map') url += window.location.hash;
        if (url!=window.location.search) history.pushState(obj,'',url);

        // change title
        document.title = `${title} | ${subtitle}`;

        return obj;
    },{
        showMap:{type:'map',map:'',name:searchParams.get('show')||'',title:''},
        archive:searchParams.get('archive')=='old',
        sortBy:searchParams.get('sortBy')||'map',
        hideNav:searchParams.has('hidenav'),
        isAdmin:false
    });

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

            let s = (!notice.expired||(notice.expired&&noticeFilters.archive));
            let show = false;
            if (noticeFilters.showMap.type == 'non-map' && s) {
                if (noticeFilters.showMap.map == 'closure' && notice.is_closure) show = true;
                if (noticeFilters.showMap.map == 'hunting' && notice_type == 'Hunting Closure') show = true;
                if (noticeFilters.showMap.map == 'non-hunting' && notice_type == 'Non-Hunting Closure') show = true;
                if (noticeFilters.showMap.map == 'rev-notice' && notice_type == 'Map Revision') show = true;
                if (noticeFilters.showMap.map == 'temp-notice' && notice_type == 'Temporary Notice') show = true;    
            } else {
                show = s;
            }
            notice.show = show;

            return notice;
        }

        if (noticeFilters.sortBy == 'map') {
            const tn = groupBy(orderBy(notices.data,['tn_Date'],['desc']),'tn_tmid');
            const tm = [];
            maps.data.forEach(m => {
                let show = (noticeFilters.showMap.type=='map'&&noticeFilters.showMap.map)?(m.tm_id==noticeFilters.showMap.map):true;
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
                const adj = [];
                m.tm_adjacent.split(',').map(a=>{
                    const id = maps.data.find(b=>b.tm_name==a.trim())?.tm_id;
                    adj.push({id:id,name:a.trim()})
                });
                tm.push({
                    ...m,
                    show:show,
                    mapNameSC:snakeCase(m.tm_name),
                    active_notices:active_notices,
                    active_closures:active_closures,
                    total_notices:total_notices,
                    display_count:display_count,
                    adjacentMaps:adj,
                    notices:tn[m.tm_id]
                });
            });
            //console.debug(tm);
            setDisplayTotal(tm.map(m=>m.display_count).reduce((a,b)=>a+b));
            return tm;
        } else {
            const tn = orderBy(notices.data,['tn_Date'],['desc']);            
            tn.forEach(process_notice);
            //console.debug(tn);
            return tn;
        }
    },[maps.data,notices.data,noticeFilters]);

    useEffect(() => {
        if (!mapNotices||!headerRef.current) return;
        if (window.location.hash) {
            const offset = (headerRef.current.offsetHeight)*-1;
            scroller.scrollTo(snakeCase(window.location.hash.slice(1,)),{smooth:'true',delay:0,offset:offset});
        }
    },[window.location,mapNotices,headerRef]);
    return (
        <Container as="main" className="mt-3" fluid>
            {(maps.isLoading||notices.isLoading) && <Loading/>}
            {((maps.isError||notices.isError)&&isOnline) && <LoadingError/>}
            {(maps.data&&notices.data) && 
                <>
                    {!noticeFilters.hideNav &&
                        <div ref={headerRef} id="sticky-header">
                            {noticeFilters.sortBy=='map' && <NavHeader mapNotices={mapNotices} noticeFilters={noticeFilters} headerRef={headerRef}/>}
                            <NoticeFilter maps={maps.data} noticeFilters={noticeFilters} setNoticeFilters={setNoticeFilters}/>
                        </div>
                    }
                    <Row className="mx-2 mb-1">
                        {noticeFilters.isAdmin && 
                            <Col className="p-0">
                                <Button variant="success"><Icon icon="akar-icons:plus" className="pb-1" width="24" height="24"/>Add New Notice</Button>
                            </Col>
                        }
                        <Col className="p-0 text-end align-self-end">Notices Displayed: {displayTotal}</Col>
                    </Row>
                    <Notices mapNotices={mapNotices} noticeFilters={noticeFilters} setNoticeFilters={setNoticeFilters}/>
                </>
            }
        </Container>
    );
}

function NavHeader({mapNotices,noticeFilters,headerRef}) {
    const [offset,setOffset] = useState(0);

    //TODO: Move to mapNotices object build above
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
        return (noticeFilters.showMap.type=='non-map' && !mapNotices[i].display_count)?true:!mapNotices[i].show;
    },[mapNotices,noticeFilters]);

    useEffect(() => {
        if (!headerRef.current) return;
        const offset = (headerRef.current.offsetHeight+50)*-1;
        setOffset(offset);
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
                        <Nav.Link as={Link} href={`#${m.tm_name}`} to={`${m.tm_name}`} className={getClassName(i)} activeClass="highlight" smooth={true} spy={true} hashSpy={true} delay={0} duration={2000} offset={offset} disabled={isDisabled(i)}>{m.tm_name}</Nav.Link>
                    </Nav.Item>
                ))}
            </Nav>
        </section>
    );
}

function NoticeFilter({maps,noticeFilters,setNoticeFilters}) {
    const showMapRef = useRef();
    const [showArchived,setShowArchived] = useState(noticeFilters.archive);
    const [sortBy,setSortBy] = useState(noticeFilters.sortBy);
    const handleChange = e => {
        switch(e.target.name) {
            case "showMap":
                const obj = JSON.parse(e.target.value);
                setNoticeFilters({showMap:obj});
                break;
            case "archived":
                setShowArchived(e.target.checked);
                setNoticeFilters({archive:e.target.checked});
                break;
            case "sortBy":
                setSortBy(e.target.value);
                setNoticeFilters({sortBy:e.target.value});
                break;
        }
    }
    return (
        <section className="border rounded p-2 my-3">
            <Form>
                <div className="d-flex justify-content-between">
                    <Form.Group as={Row} className="d-flex align-items-center">
                        <Form.Label column xs="auto">Show: </Form.Label>
                        <Col xs="auto">
                            <Form.Select ref={showMapRef} aria-label="Show only selected" name="showMap" value={JSON.stringify(noticeFilters.showMap)} onChange={handleChange} disabled={sortBy=='date'}>
                                <option value={JSON.stringify({type:'map',map:'',name:'',title:''})}>All Notices</option>
                                {nonMapList.map(nm=><option key={nm.name} value={JSON.stringify({type:'non-map',map:nm.name,name:nm.name,title:nm.title})}>{nm.title}</option>)}
                                <option disabled value="">-----</option>
                                {maps.map(m=><option key={m.tm_id} value={JSON.stringify({type:'map',map:m.tm_id,name:m.tm_name,title:m.tm_name})}>{m.tm_name}</option>)}
                            </Form.Select>
                        </Col>
                        <Col xs="auto">
                            <Form.Check type="switch" name="archived" label="Archived" checked={showArchived} onChange={handleChange}/>
                        </Col>
                    </Form.Group>
                    {!noticeFilters.showMap.map && 
                        <Form.Group as={Row} className="d-flex align-items-center">
                            <Form.Label column xs="auto">Sort By: </Form.Label>
                            <Col xs="auto">
                                <Form.Check type="radio" name="sortBy" label="Map" value="map" inline checked={sortBy=='map'} onChange={handleChange}/>
                                <Form.Check type="radio" name="sortBy" label="Date" value="date" inline checked={sortBy=='date'} onChange={handleChange}/>
                            </Col>
                        </Form.Group>
                    }
                </div>
            </Form>
        </section>
    );
}

function Notices({mapNotices,noticeFilters,setNoticeFilters}) {
    const handleAdminButtons = useCallback((action,tn_id) => {
        if (action == 'edit') window.open(`https://fingerlakestrail.org/FLTC/editnotices.php?noticeid=${tn_id}`,'EditNotice','top=100,left=100,width=600,height=740,resizable,scrollbars,status=0');
    },[mapNotices,noticeFilters]);
    return (
        <section id="notice-grid" className={`border rounded mb-5 ${(noticeFilters.sortBy=='date')?'pt-2':''}`}>
            {noticeFilters.sortBy=='map' && mapNotices.map(m => {
                if (!m.show) return null;
                if (noticeFilters.showMap.type=='non-map' && !m.notices?.some(n=>n.show)) return null;
                return (
                    <section key={m.tm_id} id={m.mapNameSC} name={m.tm_name} className="mt-2">
                        <NoticeHeader map={m} noticeFilters={noticeFilters} setNoticeFilters={setNoticeFilters}/>
                        <NoticeDetails notices={m.notices} isAdmin={noticeFilters.isAdmin} handleAdminButtons={handleAdminButtons}/>
                    </section>
                );
            })}
            {noticeFilters.sortBy=='date' && <NoticeDetails notices={mapNotices} isAdmin={noticeFilters.isAdmin} handleAdminButtons={handleAdminButtons}/>}
        </section>
    )
}

function NoticeHeader({map,noticeFilters,setNoticeFilters}) {
    return (
        <header className="mx-2 p-2 rounded-top">
            <Row>
                <Col xs={12} className="text-center">{map.tm_name}{map.tm_location && <small> - {map.tm_location}</small>}</Col>
            </Row>
            <Row>
                <Col xs={6}>Revised: <FormatDate>{map.tm_revision}</FormatDate></Col>
                <Col xs={6} className="text-end">Count: {map.display_count}</Col>
            </Row>
            {(noticeFilters.showMap.type=='map'&&noticeFilters.showMap.map!='') && 
                <Row>
                    <Col xs={12} className="text-center">Adjacent Maps: {map.adjacentMaps.map(a => {
                        if (a.id) return <a key={a.name} className="me-2" style={{color:'#fff'}} onClick={()=>setNoticeFilters({showMap:{type:'map',map:a.id}})}>{a.name}</a>;
                        return <span key={a.name} className="me-2">{a.name}</span>;
                    })}</Col>
                </Row>
            }
        </header>
    );
}

function NoticeDetails({notices,isAdmin,handleAdminButtons}) {
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
                const mailtoSubject = `Trail Condition Notice - ${n.mapName}`;
                return (
                    <Row key={n.tn_id} as="article" id={`notice_id-${n.tn_id}`} className={cName}>
                        <Col md={3} className="border border-secondary p-2">
                            <p className="mb-0 fw-bold">{n.mapName}</p>
                            <p className="mb-0"><FormatDate>{n.tn_Date}</FormatDate></p>
                            {n.notice_type && <p className="mb-0 text-danger"><strong>{n.tn_tempNotice=="1"&&<Icon icon="mdi:alert"/>}{n.notice_type}</strong></p>}
                            {n.expired && <p className="mb-0 text-danger"><strong>EXPIRED!</strong></p>}
                            {isAdmin && <div className="d-flex">
                                <Button variant="warning" className="mt-2 me-2" onClick={()=>handleAdminButtons('edit',n.tn_id)}><Icon icon="akar-icons:edit" width="24" height="24" className="pb-1"/>Edit</Button>
                                <Button variant="primary" className="mt-2" href={`mailto:hiking@fingerlakestrail.org?body=${mailtoBody}&subject=${mailtoSubject}`}><Icon icon="akar-icons:send" width="24" height="24" className="pb-1"/>Email</Button>
                            </div>}
                        </Col>
                        <Col md={9} className="border border-secondary p-2">
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
