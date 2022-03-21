import React, {useEffect, useState} from "react";
import Grid, {GridColumn, GridColumnGroup} from "./sheet/Grid";
import {Vertical} from "react-hook-components";


export default function App() {
    const [data, setData] = useState([]);
    const [columns, setColumns] = useState<Array<GridColumn | GridColumnGroup>>([
        {
            title: 'Name',
            columns: [
                {field: 'name', width: 100, title: 'Title', dataItemToValue: ({dataItem}) => dataItem?.name?.title},
                {
                    title: 'Name Group',
                    columns: [
                        {
                            field: 'first',
                            width: 100,
                            title: 'First',
                            dataItemToValue: ({dataItem}) => dataItem?.name?.first
                        },
                        {
                            field: 'last',
                            width: 100,
                            title: 'Last',
                            dataItemToValue: ({dataItem}) => dataItem?.name?.last
                        }
                    ]
                }
            ]
        },
        {
            field: 'gender', width: '10%', title: 'Gender',
            cellSpanFunction: props => {
                let rowSpan = 1;
                while (props.getCellValue(props.rowIndex, props.colIndex) === props.getCellValue(props.rowIndex + rowSpan, props.colIndex)) {
                    rowSpan++;
                }
                return {
                    rowSpan: rowSpan
                }
            },
            cellStyleFunction: () => {
                return {
                    background: '#fff',
                    height: '100%',
                    textAlign: 'center'
                };
            }
        },
        {field: 'cell', width: 800, title: 'Cell'},
        {field: 'email', width: 800, title: 'Email'}
    ]);
    const [focusedItem, setFocusedItem] = useState(undefined);
    useEffect(() => {
        (async () => {
            const response = await fetch('./person.json');
            const data: any = await response.json();
            setData(data.results);
        })();

    }, []);
    return <Vertical style={{
        padding: 10,
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
    }}>
        <Vertical hAlign={'right'} style={{marginBottom: 10}}>
            <button onClick={() => {
                setColumns([
                    {
                        field: 'name', width: 100, title: 'Name', dataItemToValue: (props: any) => {
                            return `${props.dataItem.name.title} ${props.dataItem.name.first} ${props.dataItem.name.last}`
                        }
                    },
                    {field: 'email', width: '100%', title: 'Email'}
                ]);
            }}>Test Update Column
            </button>
        </Vertical>
        <Vertical style={{overflow: "auto", flexGrow: 1, height: '100%'}}>
            <Grid data={data} columns={columns} defaultRowHeight={50} focusedDataItem={focusedItem}
                  onFocusedDataItemChange={(newItem) => setFocusedItem(newItem)}
                  pinnedLeftColumnIndex={2}
            />
        </Vertical>
    </Vertical>
}
//
// function CellComponentPicture(props:CellComponentStyledProps) {
//     const dataItem = props.dataItem;
//     return <Vertical hAlign={'center'} vAlign={'center'} style={props.cellStyle}>
//         <img src={dataItem.picture.thumbnail} style={{width:40,height:40,borderRadius:40}} alt={'Thumbnail image of the person'}/>
//     </Vertical>
// }
