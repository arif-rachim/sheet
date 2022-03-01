import {Sheet} from "sheet/Sheet";
import React from "react";
import {generateRandomData} from "data";

const {data,columns} = generateRandomData();
export default function App(){
    return <div style={{padding:10,height:'100%',boxSizing:'border-box'}}>
        <Sheet data={data} columns={columns}/>
    </div>
}