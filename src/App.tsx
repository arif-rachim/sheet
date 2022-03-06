
import React from "react";
import {generateRandomData} from "./data";
import Grid from "./sheet/Grid";

const {data,columns} = generateRandomData();

export default function App(){
    return <div style={{padding:10,height:'100%',width:'100%',boxSizing:'border-box',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <Grid data={data} columns={columns} />
    </div>
}