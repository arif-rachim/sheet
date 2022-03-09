import React, {useEffect, useState} from "react";
import Grid from "./sheet/Grid";
import {Vertical} from "react-hook-components";
import {CellComponentStyledProps} from "./sheet/Sheet";



export default function App() {
    const [data,setData] = useState([]);
    const [focusedItem,setFocusedItem] = useState(undefined);
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
            {field:'name',width:500,title:'Name',dataItemToValue:(props) => {
                    return `${props.dataItem.name.title} ${props.dataItem.name.first} ${props.dataItem.name.last}`
                }
            },
            {field:'gender',width:200,title:'Gender'},
            {field:'cell',width:300,title:'Cell'},
            {field:'email',width:500,title:'Email'}
        ]} defaultRowHeight={50} focusedDataItem={focusedItem} onFocusedDataItemChange={(newItem) => {
            setFocusedItem(newItem);
        }} />
    </div>
}
//
// function CellComponentPicture(props:CellComponentStyledProps) {
//     const dataItem = props.dataItem;
//     return <Vertical hAlign={'center'} vAlign={'center'} style={props.cellStyle}>
//         <img src={dataItem.picture.thumbnail} style={{width:40,height:40,borderRadius:40}} alt={'Thumbnail image of the person'}/>
//     </Vertical>
// }
