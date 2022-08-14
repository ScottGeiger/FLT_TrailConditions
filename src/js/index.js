import React from "react";
import ReactDOM from "react-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { CookiesProvider } from 'react-cookie';
import { BrowserRouter } from "react-router-dom";

import '../scss/app.scss';
import '../css/styles.css';

import App from "./app";

const queryClient = new QueryClient({
    defaultOptions:{
        queries:{
            networkMode:'always',
            refetchOnWindowFocus:false, //for testing
            cacheTime: 1000 * 60 * 60 * 24, // 24 hours
            staleTime: 1000 * 60 * 5, // 5 minutes
            notifyOnChangeProps:['data','error'],
            retry:3,
            retryDelay:attempt=>Math.min(attempt > 0 ? 2 ** attempt * 2000 : 1000, 30 * 1000)
        }
    }
});

const persister = createSyncStoragePersister({
    storage: window.localStorage,
    maxAge: 1000 * 60 * 60 * 24
});

ReactDOM.render(
    <PersistQueryClientProvider client={queryClient} persistOptions={{persister}}>
        <CookiesProvider>
            <BrowserRouter>
                <App/>
                <ReactQueryDevtools initialIsOpen={false} />
            </BrowserRouter>
        </CookiesProvider>
    </PersistQueryClientProvider>
    ,document.querySelector('#root')
);