import { useQuery } from "@tanstack/react-query";

const requestTimeout = 20000; //in milliseconds

/* BASE PROMISE */
function q(u,m,b) {
    return d => {
        const bd = d || b;
        let opts = {
            method:m||'GET'
        };
        if (['POST','PUT','PATCH'].includes(m)) opts.body = bd && JSON.stringify(bd);
        return new Promise((res,rej) => {
            Promise.race([
                fetch(`https://fingerlakestrail.org/FLTCAdmin/api/api.php/${u}`,opts).then(r=>(r.ok)?r.json():rej({name:r.status,message:r.statusText,description:r.headers.get('X-Error-Description')})).catch(e=>rej(e)),
                new Promise((resolve,reject)=>setTimeout(reject,requestTimeout,{staus:408,name:'408',message:'Request Timeout'}))
            ]).then(j=>res(j)).catch(e=>rej(e));
        });
    }
}

//TODO: add code for local storage
export function useMapQueries() {
    const getMaps = (...args) => {
        const options = args[0]?.options||args[0]||{};
        return useQuery(['maps'],q('maps'),options);
    }
    const getNotices = (...args) => {
        const options = args[0]?.options||args[0]||{};
        return useQuery(['notices'],q('trailconditions'),options);
    }
    const getSession = (...args) => {
        const options = args[0]?.options||args[0]||{};
        //return useQuery(['session'],q('session'),options);
        if (!options?.staleTime) options.staleTime = 0;
        if (!options?.cacheTime) options.cacheTime = 5 * 60 * 1000; // 5 minutes
        return useQuery(['session'],()=>new Promise((res,rej)=>res({
            "season": "summer",
            "login_array": {
                "aid": "69",
                "name": "Scott Geiger",
                "usr_email": "scott.geiger@fingerlakestrail.org",
                "boardAccess": 1,
                "adminAccess": 1,
                "specialAccess": "ne,me,bdv,rtc,tax,nm,tmp",
                "BOMAccess": "1"
            }
        })),options);
    }

    return {getMaps,getNotices,getSession};
}
