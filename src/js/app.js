import React, { useEffect, useState, useMemo, useRef, useReducer, Suspense } from "react";
import { onlineManager } from '@tanstack/react-query';
import { Container, Row, Col, Button, Collapse } from "react-bootstrap";
import { useMapQueries } from "./queries";
import { useSearchParams } from "react-router-dom";
import { groupBy, orderBy, snakeCase, startCase } from "lodash";
//import { scroller } from "react-scroll";
import { Icon } from '@iconify/react';
import { Loading, LoadingError } from "./utils";
import { title, nonMapList } from "./config";

const NavHeader = React.lazy(()=>import("../js/blocks/navheader"));
const NoticeFilter = React.lazy(()=>import("../js/blocks/noticefilter"));
const Notices = React.lazy(()=>import("../js/blocks/notices"));

export default function App() {
    const [searchParams,setSearchParams] = useSearchParams();

    const [displayTotal,setDisplayTotal] = useState(0);
    const headerRef = useRef();

    const isOnline = onlineManager.isOnline();
    const {getSession,getMaps,getNotices} = useMapQueries();
    const session = getSession({onSuccess:d => setNoticeFilters({isAdmin:searchParams.has('showAdmin')||!!d?.login_array?.aid})});
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
        if (obj.sortBy=='map'&&!obj.showMap.map) url += window.location.hash;
        if (url!=window.location.search) history.pushState(obj,'',url);

        // change title
        document.title = `${title} | ${subtitle}`;

        return obj;
    },{
        showMap:{type:'',map:'',name:searchParams.get('show')?.toUpperCase()||'',title:''},
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
                if (noticeFilters.showMap.map == 'hide-hunting' && notice_type != 'Hunting Closure') show = true;
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
                    if (show&&n.show) display_count++;
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

    const [showNav,setShowNav] = useState(true);
    const [WPStyles,setWPStyles] = useState({});

    const handleNewNotice = () => {
        const width = (window.innerWidth-100)*.7||580;
        const height = (window.innerHeight-100)*.9||740;
        console.debug('Create New Notice');
        window.open('https://fingerlakestrail.org/FLTC/editnotices.php?noticeid=new','NewNotice',`top=100,left=100,width=${width},height=${height},resizable,scrollbars,status=0`);
    }
    useEffect(() => {
        if (!mapNotices||!headerRef.current) return;
        /*if (window.location.hash) {
            const offset = (headerRef.current.offsetHeight)*-1;
            //scroller.scrollTo(snakeCase(window.location.hash.slice(1,)),{smooth:'false',delay:0,offset:offset});
        }*/
        //if page is inside WP recalculate bottom of header
        const header = document.querySelector('#header');
        if (header) {
            //TODO: check for WPAdmin
            const rect = header.getBoundingClientRect();
            const bottom = (rect?.width<=989)?0:rect?.bottom;
            setWPStyles({top:`${bottom}px`});
        }
    },[window.location,mapNotices,headerRef]);
    return (
        <Container as="main" className="mt-3" fluid>
            {(maps.isLoading||notices.isLoading) && <Loading/>}
            {((maps.isError||notices.isError)&&isOnline) && <LoadingError/>}
            {(maps.data&&notices.data) && 
                <Suspense fallback={<Loading/>}>
                    {!noticeFilters.hideNav &&
                        <div ref={headerRef} id="sticky-header" style={WPStyles} className="mb-3 p-2 pb-1 rounded">
                            <Collapse in={showNav}>
                                <div id="nav-menu">
                                    {noticeFilters.sortBy=='map' && <NavHeader mapNotices={mapNotices} noticeFilters={noticeFilters} headerRef={headerRef}/>}
                                    <NoticeFilter maps={maps.data} noticeFilters={noticeFilters} setNoticeFilters={setNoticeFilters} nonMapList={nonMapList}/>
                                </div>
                            </Collapse>
                            <section className="px-1 py-0">
                                <Row className="mx-2 mb-1">
                                    <Col className="p-0">
                                        {noticeFilters.isAdmin&&<Button variant="success" onClick={handleNewNotice}><Icon icon="akar-icons:plus" className="pb-1" width="24" height="24"/>Add New Notice</Button>}
                                    </Col>
                                    <Col xs={3} sm={1} className="text-center"><Button variant="light" className="mt-1" onClick={()=>setShowNav(!showNav)}><Icon icon={(showNav)?"akar-icons:chevron-up":"akar-icons:chevron-down"}/></Button></Col>
                                    <Col className="p-0 text-end align-self-end">Notices<span className="d-none d-md-inline"> Displayed</span>: {displayTotal}</Col>
                                </Row>
                            </section>
                        </div>
                    }
                    <Notices mapNotices={mapNotices} noticeFilters={noticeFilters} setNoticeFilters={setNoticeFilters}/>
                </Suspense>
            }
        </Container>
    );
}
