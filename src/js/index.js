import React from "react";
import ReactDOM from "react-dom";
//import {BrowserRouter} from "react-router-dom";
import {QueryClient,QueryClientProvider} from "react-query";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { red, blue, grey, lightBlue } from "@mui/material/colors";
import App from "./app";

const queryClient = new QueryClient({
    defaultOptions:{
        queries:{
            cacheTime:1800000,
            staleTime:60000,
            notifyOnChangeProps:['data','error'],
            retry:2,
            retryDelay:attempt=>Math.min(attempt > 0 ? 2 ** attempt * 2000 : 1000, 30 * 1000)
        }
    }
});

const theme = createTheme({
    palette: {
        closure : {
            main: red[800],
            contrastText: '#fff'
        },
        notice : {
            main: lightBlue[800],
            contrastText: '#fff'
        },
        inactive: {
            main: grey[600],
            contrastText: '#fff'
        },
        noticeHeader: {
            main: '#c3512f',
            contrastText: 'fff'
        }
    }
});

ReactDOM.render(
    <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
            <App/>
        </QueryClientProvider>
    </ThemeProvider>
    ,document.querySelector('#root')
);