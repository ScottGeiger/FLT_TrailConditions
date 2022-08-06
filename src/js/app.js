import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "react-query";
import { groupBy, orderBy, map, reduce } from "lodash";
import { styled } from '@mui/system';
import htmr from "htmr";
import { format, parse } from "date-fns";
import { useMapQueries } from "./queries";
import { Box, Button, Chip, Container, Grid, Link, Stack, Typography, Paper, Alert } from "@mui/material";
import { FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch, FormLabel, RadioGroup, Radio } from "@mui/material";

import "../css/styles.css";

const grey = {
    50: '#F3F6F9',
    100: '#E7EBF0',
    200: '#E0E3E7',
    300: '#CDD2D7',
    400: '#B2BAC2',
    500: '#A0AAB4',
    600: '#6F7E8C',
    700: '#3E5060',
    800: '#2D3843',
    900: '#1A2027',
};

const NoticeSection = styled('section')(() => `
    header { background-color: ${grey[400]} }
`);

const FormatDate = React.memo(({fmt,children}) => {
    const dt = (!children)?new Date():new Date(children*1000);
    return (!fmt)?format(dt,'PP'):format(dt,fmt);
});

export default function App() {
    const [showArchived,setShowArchived] = useState(false);
    const [sortBy,setSortBy] = useState('map');
    const [filter,setFilter] = useState('all');

    //const {getMaps,getNotices} = useMapQueries();
    //const maps = getMaps();
    const maps = useQuery('maps',()=>fetch('https://fingerlakestrail.org/FLTCAdmin/api/api.php/maps').then(r=>r.json()));
    const notices = useQuery('notices',()=>fetch('https://fingerlakestrail.org/FLTCAdmin/api/api.php/trailconditions').then(r=>r.json()),{select:d=>{
        return groupBy(orderBy(d,['tn_Date'],['desc']),'tn_tmid');
    }});

    const filterComponent = useMemo(() => {
        return(
            <form>
                <Grid container>
                    <Grid item xs={12} sm={6}>
                        <Box sx={{display:'flex',gap:'16px'}}>
                            <FormControl fullWidth>
                                <InputLabel id="show">Show:</InputLabel>
                                <Select labelId="show" label="Show" value={filter} onChange={e=>setFilter(e.target.value)}>
                                    <MenuItem value="all">All Notices</MenuItem>
                                    {maps.isSuccess&&maps.data.map(m=><MenuItem key={m.tm_id} value={m.tm_name}>{m.tm_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        <FormControlLabel control={<Switch onChange={()=>setShowArchived(!showArchived)} checked={showArchived}/>} label="Archived"/>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth sx={{flexDirection:'row',justifyContent:'end'}}>
                            <FormLabel id="sortBy-label" sx={{p:2}}>Sort By:</FormLabel>
                            <RadioGroup row aria-labelledby="sortBy-lable" name="sortBy">
                                <FormControlLabel value="map" control={<Radio/>} label="Map"/>
                                <FormControlLabel value="date" control={<Radio/>} label="Date"/>
                            </RadioGroup>
                        </FormControl>
                    </Grid>
                </Grid>
            </form>
        );
    },[showArchived,sortBy,filter,maps.data]);

    const filteredNotices = useMemo(()=>{
        if (!notices.data) return;
        const tempNotices = {};
        const now = Date.now()/1000;
        Object.keys(notices.data).forEach(m => {
            const fn = notices.data[m].filter(n => {
                if (n.tn_Expire < now) {
                    if (!showArchived) return false;
                    n.expired = true;
                }
                return n;
            });
            tempNotices[m] = fn;
        });
        return tempNotices;
    },[maps.data,notices.data,showArchived]);

    if (maps.isError||notices.isError) return <p>Error Loading</p>;
    if (maps.isLoading||notices.isLoading) return <p>Loading...</p>;
    return (
        <Container disableGutters component="main">
            <header>
                <MUIHeaderLinks maps={maps.data}/>
                {filterComponent}
            </header>
            <Box component="main">
                <MUINoticesSections maps={maps.data} notices={filteredNotices}/>
            </Box>
        </Container>
    );
}

function MUIHeaderLinks({maps}) {
    const scrollTo = href => {
        window.location.hash = href;
    }
    return (
        <Paper sx={{my:2,p:2,display:{xs:'none',md:'block'}}}>
            <Stack direction="row" sx={{flexWrap:'wrap'}}>
                {maps.map(m=><Link key={m.tm_id} component="button" variant="body2" underline="hover" onClick={()=>scrollTo(m.tm_name)} sx={{mr:2}}>{m.tm_name}</Link>)}
            </Stack>
        </Paper>
    );
}

function MUIHeaderFilter() {
    const [filter,setFilter] = useState('')
    return (
        <form>
            <Grid container>
                <Grid item xs={12} sm={6}>
                    <Box sx={{display:'flex',gap:'16px'}}>
                        <FormControl fullWidth>
                            <InputLabel id="show">Show:</InputLabel>
                            <Select labelId="show" label="Show" value={filter} onChange={e=>setFilter(e.target.value)}>
                                <MenuItem value="all">All Notices</MenuItem>
                                <MenuItem value="1">M1/CT1</MenuItem>
                                <MenuItem value="2">M2/CT2</MenuItem>
                            </Select>
                        </FormControl>
                    <FormControlLabel control={<Switch/>} label="Archived"/>
                    </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth sx={{flexDirection:'row',justifyContent:'end'}}>
                        <FormLabel id="sortBy-label" sx={{p:2}}>Sort By:</FormLabel>
                        <RadioGroup row aria-aria-labelledby="sortBy-lable" name="sortBy">
                            <FormControlLabel value="map" control={<Radio/>} label="Map"/>
                            <FormControlLabel value="date" control={<Radio/>} label="Date"/>
                        </RadioGroup>
                    </FormControl>
                </Grid>
            </Grid>
        </form>
    );
}

function MUINoticesSections({maps,notices}) {
    return (
        <Paper sx={{my:2}}>
            {maps.map(m=>(
                <NoticeSection key={m.tm_id} id={m.tm_id}>
                    <MUINoticeSectionHeader map={m} notices={notices[m.tm_id]}/>
                    <Grid container rowSpacing={2}>
                        {(notices[m.tm_id]&&notices[m.tm_id]!=0)?
                            notices[m.tm_id].map(n=><MUINoticeSectionBody key={n.tn_id} notice={n}/>):
                            <Grid container item component="article" xs={12}>
                                <Grid item xs={12} align="center" sx={{p:2}}>
                                    <p>No Notices</p>
                                </Grid>
                            </Grid>
                        }
                    </Grid>
                </NoticeSection>
            ))}
        </Paper>
    );
}
function MUINoticeSectionHeader({map,notices}) {
    return (
        <Grid container component="header" sx={{p:2}}>
            <Grid align="center" item xs={12}>
                <p>{map.tm_name} {map.tm_location&&<span>| {map.tm_location}</span>}</p>
            </Grid>
            <Grid item xs={6}>
                <p>Revised: <FormatDate>{map.tm_revision}</FormatDate></p>
            </Grid>
            <Grid item align="right" xs={6}>
                <p>Count: {notices?.length||0}</p>
            </Grid>
        </Grid>
    );
}
function MUINoticeSectionBody({notice}) {
    const parseHTML = () => {
        let html = null
        try {
            html = htmr(notice.tn_Notice);
        } catch {
            console.error('Unabled to display Notice - Invalid HTML');
            html = <Alert severity="error">Unabled to display Notice - Invalid HTML</Alert>
        }
        return html;
    }
    return (
        <Grid container item component="article" xs={12} rowSpacing={2} sx={{p:2,pt:0,m:0}}>
            <Grid item xs={12} md={3} lg={2}>
                <p><FormatDate>{notice.tn_Date}</FormatDate></p>
                {notice.expired&&<p>EXPIRED!</p>}
            </Grid>
            <Grid item xs={12} md={9} lg={10}>
                {parseHTML()}
            </Grid>
        </Grid>
    );
}

