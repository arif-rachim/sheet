import {Sheet} from "sheet/Sheet";
import React from "react";
import {generateRandomData} from "data";
const {data,columns} = generateRandomData();

export default function App(){
    return <div style={{padding:10,height:'100%',boxSizing:'border-box',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <Sheet data={data} columns={columns}  columnsLength={{1:300,2:10}} rowsLength={{1:30,5:60}}/>
    </div>
}