import React, {useEffect, useState} from "react";
import Grid from "./sheet/Grid";

export default function App() {
    const [data,setData] = useState([])
    useEffect(() => {
        (async() => {
            const response = await fetch('./person.json');
            const data:any = await response.json();
            setData(data.results);
        })();

    },[])
    return <div style={{
        padding: 10,
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }}>
        <Grid data={data} columns={[
            {field:'gender',width:200,title:'Gender'},
            {field:'cell',width:300,title:'Cell'},
            {field:'email',width:500,title:'Email'}
        ]}/>
    </div>
}