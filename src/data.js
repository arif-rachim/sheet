
export function generateRandomData(){
    const numberOfColumns = Math.ceil((1+Math.random()) * 30);
    const numberOfRecords = Math.ceil((1+Math.random()) * 1);
    const columns = Array.from({length:numberOfColumns}).map((_,columnIndex) => pad('00000000',columnIndex.toString()));
    const data = Array.from({length:numberOfRecords}).map((_,rIndex) => {
        const rowIndex = pad('00000000',rIndex.toString());
        columns.reduce((acc,columnIndex) => {
            acc[columnIndex] = `{row:${rowIndex},col:${columnIndex}}`;
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
export function pad(pattern = "00", text = "0", on = "right") {
    text = text.toString();
    if (on === "right") {
        const joinArray = [...pattern, ...text];
        joinArray.splice(0, text.length);
        return joinArray.join("");
    }
    if (on === "left") {
        return [...text, ...pattern].join("").substr(0, pattern.length);
    }
}