import React, {useEffect, useState} from "react";
import Grid from "./sheet/Grid";
import {Vertical} from "react-hook-components";
import {CellComponentStyledProps} from "./sheet/Sheet";



export default function App() {
    const [data,setData] = useState([])
    useEffect(() => {
        (async() => {
            const response = await fetch('./person.json');
            const data:any = await response.json();
            debugger;

            // cell: "043-878-75-12"
            // dob: {date: '1973-12-15T23:35:35.416Z', age: 49}
            // email: "pihla.mattila@example.com"
            // gender: "female"
            // id: {name: 'HETU', value: 'NaNNA370undefined'}
            // location: {street: {…}, city: 'Kärkölä', state: 'Satakunta', country: 'Finland', postcode: 74097, …}
            // login: {uuid: '4b584ded-53c2-4b4e-9b7f-8c415cd419e9', username: 'goldengorilla432', password: '383838', salt: '18Cz3QIF', md5: '1bd8de034d58af2fe5716c43d5b93e43', …}
            // name: {title: 'Miss', first: 'Pihla', last: 'Mattila'}
            // nat: "FI"
            // phone: "09-988-583"
            // picture: {large: 'https://randomuser.me/api/portraits/women/37.jpg', medium: 'https://randomuser.me/api/portraits/med/women/37.jpg', thumbnail: 'https://randomuser.me/api/portraits/thumb/women/37.jpg'}
            // registered: {date: '2003-02-22T10:31:30.748Z', age: 19}
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
            {field:'picture',width:120,title:'Picture',cellComponent:CellComponentPicture},
            {field:'name',width:500,title:'Name',dataItemToValue:(props) => {
                    return `${props.dataItem.name.title} ${props.dataItem.name.first} ${props.dataItem.name.last}`
                }
            },
            {field:'gender',width:200,title:'Gender'},
            {field:'cell',width:300,title:'Cell'},
            {field:'email',width:500,title:'Email'}
        ]} defaultRowHeight={50}/>
    </div>
}

function CellComponentPicture(props:CellComponentStyledProps) {
    const dataItem = props.dataItem;
    return <Vertical hAlign={'center'} vAlign={'center'} style={props.cellStyle}>
        <img src={dataItem.picture.thumbnail} style={{width:40,height:40,borderRadius:40}} alt={'Thumbnail image of the person'}/>
    </Vertical>
}
