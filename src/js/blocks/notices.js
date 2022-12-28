import React, { useCallback } from "react";
import { Row, Col, Button } from "react-bootstrap";
import htmr from "htmr";
import { Icon } from '@iconify/react';
import { FormatDate } from "../utils";
import { mailtoBody } from "../config";

export default function Notices({mapNotices,noticeFilters,setNoticeFilters}) {
    const handleAdminButtons = useCallback((action,tn_id) => {
        if (action == 'edit') {
            const width = (window.innerWidth-100)*.7||580;
            const height = (window.innerHeight-100)*.9||740;
            console.log(width,height);
            console.debug(`Edit Notice (id: ${tn_id})`);
            window.open(`https://fingerlakestrail.org/FLTC/editnotices.php?noticeid=${tn_id}`,'EditNotice',`top=100,left=100,width=${width},height=${height},resizable,scrollbars,status=0`);
        }
    },[mapNotices,noticeFilters]);
    return (
        <section id="notice-grid" className={`border rounded mb-5 ${(noticeFilters.sortBy=='date')?'pt-2':''}`}>
            {noticeFilters.sortBy=='map' && mapNotices.map(m => {
                if (!m.show) return null;
                if (noticeFilters.showMap.type=='non-map' && !m.notices?.some(n=>n.show)) return null;
                return (
                    <section key={m.tm_id} id={m.mapNameSC} name={m.tm_name} className="mt-2 mb-4">
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
                <Col xs={12} className="text-md-center">
                    {map.tm_name}{map.tm_location && <small> - {map.tm_location}</small>}
                    {map.tm_url && 
                        <Button href={`/${map.tm_url}`} size="sm" variant="light" className="ms-1 py-0">
                            <Icon icon="akar-icons:cart" className="pb-1" width="18" height="18"/>
                            Buy<span className="d-none d-md-inline"> Map</span>
                        </Button>}
                </Col>
            </Row>
            <Row>
                <Col xs={12} md={6}>Revised: <FormatDate>{map.tm_revision}</FormatDate></Col>
                <Col xs={12} md={6} className="text-md-end">Count: {map.display_count}</Col>
            </Row>
            {(noticeFilters.showMap.type=='map'&&noticeFilters.showMap.map!='') && 
                <Row className="adjacent">
                    <Col xs={12} className="text-md-center">Adjacent Maps: {map.adjacentMaps.map(a => {
                        if (a.id) return <a key={a.name} className="me-2" style={{color:'#fff'}} onClick={()=>setNoticeFilters({showMap:{type:'map',map:a.id,name:a.name,title:a.name}})}>{a.name}</a>;
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
                            {n.tn_tempNotice=="1"&&n.closure_text && <p className="mb-0 text-danger d-block d-md-none">{n.closure_text}</p>}
                            {n.expired && <p className="mb-0 text-danger"><strong>EXPIRED!</strong></p>}
                            {isAdmin && <div className="d-flex">
                                <Button variant="warning" className="mt-2 me-2" onClick={()=>handleAdminButtons('edit',n.tn_id)}><Icon icon="akar-icons:edit" width="24" height="24" className="pb-1"/>Edit</Button>
                                <Button variant="primary" className="mt-2" href={`mailto:hiking@fingerlakestrail.org?body=${mailtoBody}&subject=${mailtoSubject}`}><Icon icon="akar-icons:send" width="24" height="24" className="pb-1"/>Email</Button>
                            </div>}
                        </Col>
                        <Col md={9} className="border border-secondary p-2">
                            {n.closure_text && <p className="text-danger d-none d-md-block"><strong>{n.tn_tempNotice=="1"&&<><Icon icon="mdi:alert"/>Temporary Notice: </>}{n.closure_text}</strong></p>}
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
