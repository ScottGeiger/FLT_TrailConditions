import {useQuery} from "react-query";

const requestTimeout = 20000; //in milliseconds

/* BASE PROMISE */
function q(u,m,b) {
    return d => {
        const bd = d || b;
        let opts = {Accept:'application/json',headers:{ContentType:'application/json'},method:m||'GET'};
        if (['POST','PUT','PATCH'].includes(m)) opts.body = bd && JSON.stringify(bd);
        return new Promise((res,rej) => {
            Promise.race([
                fetch(`https://fingerlakestrail.org/FLTCAdmin/api/api.php/${u}`,opts).then(r=>(!r.ok)?rej({name:r.status,message:r.statusText,description:r.headers.get('X-Error-Description')}):r.json()),
                new Promise((resolve,reject)=>setTimeout(reject,requestTimeout,{staus:408,name:'408',message:'Request Timeout'}))
            ]).then(j=>res(j)).catch(e=>rej(e));
        });
    }
}

//TODO: add code for local storage
export function useMapQueries() {
    const getMaps = () => useQuery('maps',q('maps'));
    const getNotices = () => useQuery('notices',q('notices'));

    return {getMaps,getNotices};
}
