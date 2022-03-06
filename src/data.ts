import {Column} from "./sheet/Sheet";
import {GridColumn} from "./sheet/Grid";

interface RandomDataResult{
    data:Array<any>,
    columns:Array<any>
}
export function generateRandomData(){
    const numberOfColumns = 50;
    const numberOfRecords = 200;
    const columns:Array<GridColumn> = Array.from({length:numberOfColumns}).map<GridColumn>((_,columnIndex) => {
        return {
            field:pad('000',columnIndex.toString()),
            width:100,
            title:pad('00000000',columnIndex.toString())
        }
    });
    const data:Array<any> = Array.from({length:numberOfRecords}).map<any>((_,rIndex) => {
        const rowIndex = pad('000',rIndex.toString());
        return columns.reduce((acc:any,column) => {
            acc[column.field] = `r:${rowIndex}|c:${column.field}`;
            return acc;
        },{id:rowIndex})
    });

    return {data,columns};
}

/**
 * Utilities to add padding in the number, this is useful to set time format
 * @param pattern
 * @param text
 * @param on
 * @returns {string}
 */
export function pad(pattern = "00", text = "0", on = "right"):string {
    text = text.toString();
    if (on === "right") {
        // @ts-ignore
        const joinArray = [...pattern, ...text];
        joinArray.splice(0, text.length);
        return joinArray.join("");
    }
    if (on === "left") {
        // @ts-ignore
        return [...text, ...pattern].join("").substr(0, pattern.length);
    }
    return "";
}