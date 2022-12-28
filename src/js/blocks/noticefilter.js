import React, { useState } from "react";
import { Row, Col, Form } from "react-bootstrap";

export default function NoticeFilter({maps,noticeFilters,setNoticeFilters,nonMapList}) {
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
        <section className="border rounded px-2 py-1 mb-0">
            <Form id="notice-filters">
                <div className="d-flex justify-content-between">
                    <Form.Group as={Row} className="d-flex align-items-center">
                        <Form.Label column xs="auto">Show: </Form.Label>
                        <Col xs="auto">
                            <Form.Select className="py-1" aria-label="Show only selected" name="showMap" value={JSON.stringify(noticeFilters.showMap)} onChange={handleChange}>
                                <option value={JSON.stringify({type:'map',map:'',name:'',title:''})}>All Notices</option>
                                {nonMapList.map(nm=><option key={nm.name} value={JSON.stringify({type:'non-map',map:nm.name,name:nm.name,title:nm.title})}>{nm.title}</option>)}
                                {sortBy=='map' && 
                                    <>
                                        <option disabled value="">-----</option>
                                        {maps.map(m=><option key={m.tm_id} value={JSON.stringify({type:'map',map:m.tm_id,name:m.tm_name,title:m.tm_name})}>{m.tm_name}</option>)}
                                    </>
                                }
                            </Form.Select>
                        </Col>
                        <Col xs="auto" className="pt-2 pt-sm-0">
                            <Form.Check type="switch" name="archived" label="Archived" checked={showArchived} onChange={handleChange}/>
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="d-flex align-items-center">
                        <Form.Label column xs="auto">Sort By: </Form.Label>
                        <Col xs="auto">
                            <Form.Check type="radio" name="sortBy" label="Map" value="map" inline checked={sortBy=='map'} onChange={handleChange}/>
                            <Form.Check type="radio" name="sortBy" label="Date" value="date" inline checked={sortBy=='date'} onChange={handleChange}/>
                        </Col>
                    </Form.Group>
                </div>
            </Form>
        </section>
    );
}
