import React, {
    createContext,
    CSSProperties,
    MutableRefObject,
    ReactElement,
    SyntheticEvent,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState
} from "react";
import {useObserver, useObserverListener} from "react-hook-useobserver";
import {Observer} from "react-hook-useobserver/lib/useObserver";
import {Vertical} from "react-hook-components";

const BORDER = '1px solid rgba(0,0,0,0.1)';


interface CalculateBeforeViewPort {
    index: number,
    totalLength: number,
    complete: false
}

interface CalculateInsideViewPort {
    index: number,
    totalLength: number,
    complete: boolean,
    lengths: Map<number, number>
}

function cellSpanFunctionDefaultImplementation() {
    return {colSpan: 1, rowSpan: 1}
}

interface CellSpanFunctionProps {
    lastRowIndexBeforeViewPort: number;
    lastRowIndexInsideViewPort: number;
    lastColIndexBeforeViewPort: number;
    lastColIndexInsideViewPort: number;
    rowIndex: number,
    colIndex: number,
    dataItem: any;
    data: Array<any>;
    columns: Array<Column>,
    getCellValue: (rowIndex: number, colIndex: number) => any
}

export interface CellSpanFunctionResult {
    rowSpan?: number;
    colSpan?: number
}

export interface Column {
    field: string,
    width: number | string,
    cellComponent?: React.FC<CellComponentStyledProps>,
    cellStyleFunction?: (props: CellComponentProps) => CSSProperties,
    dataItemToValue?: (props: DataItemToValueProps) => string,
    cellSpanFunction?: (props: CellSpanFunctionProps) => CellSpanFunctionResult
}


interface SheetProperties<DataItem> {
    data: Array<DataItem>,
    columns: Array<Column>,
    styleContainer?: CSSProperties,
    styleViewPort?: CSSProperties,
    $customColWidth?: Observer<Map<number, number>>,
    $customRowHeight?: Observer<Map<number, number>>,
    onScroll?: ScrollListener,
    $scrollLeft?: Observer<number>,
    $scrollTop?: Observer<number>,
    showScroller?: boolean,
    defaultColWidth: number,
    defaultRowHeight: number,
    onCellClicked?: CellClickedCallback,
    onCellClickedCapture?: CellClickedCallback,
    onCellDoubleClicked?: CellClickedCallback,
    onCellDoubleClickedCapture?: CellClickedCallback,
    hideLeftColumnIndex: number,
    $focusedDataItem?: Observer<any>

}

interface DataItemToValueProps {
    dataSource: Array<any>,
    dataItem: any,
    column: Column,
    rowIndex: number,
    colIndex: number,
}

export interface CellComponentProps extends DataItemToValueProps {
    value: any,
    colSpan: number,
    rowSpan: number
}

interface CellRendererProps extends CellComponentProps {
    height: number,
    width: number,
    top: number,
    left: number,
    style?: CSSProperties
}

export interface CellComponentStyledProps extends CellComponentProps {
    cellStyle: CSSProperties
}

interface RowAccumulator {
    elements: Array<ReactElement>,
    top: number
}

interface ColAccumulator {
    elements: Array<ReactElement>,
    left: number
}

interface RenderComponentProps {
    numberOfRowInsideViewPort: CalculateInsideViewPort,
    numberOfRowBeforeViewPort: CalculateBeforeViewPort,
    numberOfColInsideViewPort: CalculateInsideViewPort,
    numberOfColBeforeViewPort: CalculateBeforeViewPort,
    data: Array<any>,
    columns: Array<Column>,
    setElements: React.Dispatch<React.SetStateAction<React.ReactElement[]>>,
    hideLeftColumnIndex: number
}

const defaultDom = document.createElement('div');
type ScrollListener = (event: { scrollLeft: number, scrollTop: number }) => void;

const CellComponentDefaultImplementation: React.FC<CellComponentStyledProps> = (props) => {
    return <Vertical style={props.cellStyle} vAlign={'center'}>{props.value}</Vertical>
};

function cellStyleFunctionDefaultImplementation(props: CellStyleFunctionProperties): CSSProperties {
    const isFocused = props.isFocused;
    return {
        padding: '0 5px',
        backgroundColor: isFocused ? '#99D9EA' : (props.rowIndex % 2) ? '#eee' : '#fff',
        height: '100%',
        overflow: 'hidden'
    }
}

type CellClickedCallback = (event: { event: SyntheticEvent<HTMLDivElement>, rowIndex: number, columnIndex: number, dataItem: any, column: Column, value: any, dataSource: Array<any> }) => void;

interface SheetContextType {
    props?: SheetProperties<any>
}

const SheetContext = createContext<MutableRefObject<SheetContextType>>({current: {props: undefined}});

export default function Sheet<DataItem>(props: SheetProperties<DataItem>) {
    const sheetContextRef = useRef<SheetContextType>({props});
    sheetContextRef.current = {props};
    const [$reRender, setReRender] = useObserver(new Date());
    const {$customColWidth, $customRowHeight} = props;
    const [$defaultRowHeight,] = useObserver(props.defaultRowHeight);
    const [$defaultColWidth,] = useObserver(props.defaultColWidth);
    const [$viewPortDimension, setViewPortDimension] = useObserver({width: 0, height: 0});
    const [$scrollerPosition, setScrollerPosition] = useObserver({
        left: props.$scrollLeft?.current || 0,
        top: props.$scrollTop?.current || 0
    });
    const [$emptyObserver] = useObserver(0);
    const [$emptyMapObserver] = useObserver(new Map<number, number>());
    const [elements, setElements] = useState(new Array<ReactElement>());
    const forceUpdate = useCallback(() => setReRender(new Date()), []);
    useEffect(forceUpdate, [props.data, props.columns]);

    useObserverListener([props.$scrollTop || $emptyObserver, props.$scrollLeft || $emptyObserver], () => {
        const left = props.$scrollLeft?.current || 0;
        const top = props.$scrollTop?.current || 0;
        viewPortRef.current.scrollLeft = left;
        viewPortRef.current.scrollTop = top;
        setScrollerPosition({left, top})
    });

    const [$totalWidthOfContent, setTotalWidthOfContent] = useObserver(calculateLength($customColWidth?.current, props.columns, $defaultColWidth.current));
    useObserverListener($customColWidth || $emptyMapObserver, () => setTotalWidthOfContent(calculateLength($customColWidth?.current, props.columns, $defaultColWidth.current)));

    const [$totalHeightOfContent, setTotalHeightOfContent] = useObserver(calculateLength($customRowHeight?.current, props.data, $defaultRowHeight.current));
    useObserverListener($customRowHeight || $emptyMapObserver, () => setTotalHeightOfContent(calculateLength($customRowHeight?.current, props.data, $defaultRowHeight.current)));

    useEffect(() => setTotalHeightOfContent(calculateLength($customRowHeight?.current, props.data, $defaultRowHeight.current)), [props.data]);

    const viewPortRef = useRef(defaultDom);

    useEffect(() => {
        const viewPortDom = viewPortRef.current;
        let {offsetWidth, offsetHeight} = viewPortDom;
        setViewPortDimension({width: offsetWidth, height: offsetHeight});
    }, [props.styleContainer]);

    useObserverListener([$reRender, $viewPortDimension, $scrollerPosition, $defaultRowHeight, $defaultColWidth, $customRowHeight || $emptyMapObserver, $customColWidth || $emptyMapObserver], () => {

        const scrollerPosition = $scrollerPosition.current;
        const defaultRowHeight = $defaultRowHeight.current;
        const defaultColWidth = $defaultColWidth.current;
        const customRowHeight = $customRowHeight?.current;
        const customColWidth = $customColWidth?.current;

        const numberOfColBeforeViewPort: CalculateBeforeViewPort = calculateBeforeViewPort(props.columns, customColWidth, defaultColWidth, scrollerPosition?.left);
        const numberOfColInsideViewPort: CalculateInsideViewPort = calculateInsideViewPort(props.columns, numberOfColBeforeViewPort.index, customColWidth, defaultColWidth, $viewPortDimension?.current?.width, scrollerPosition?.left, numberOfColBeforeViewPort.totalLength);
        const numberOfRowBeforeViewPort: CalculateBeforeViewPort = calculateBeforeViewPort(props.data, customRowHeight, defaultRowHeight, scrollerPosition?.top);
        const numberOfRowInsideViewPort: CalculateInsideViewPort = calculateInsideViewPort(props.data, numberOfRowBeforeViewPort.index, customRowHeight, defaultRowHeight, $viewPortDimension?.current?.height, scrollerPosition?.top, numberOfRowBeforeViewPort.totalLength);

        renderComponent({
            numberOfRowInsideViewPort,
            numberOfRowBeforeViewPort,
            numberOfColInsideViewPort,
            numberOfColBeforeViewPort,
            setElements,
            data: props.data,
            columns: props.columns,
            hideLeftColumnIndex: props.hideLeftColumnIndex
        });
    });

    const handleScroller = useCallback(function handleScroller() {
        const viewPortDom = viewPortRef.current;
        setScrollerPosition({left: viewPortDom.scrollLeft, top: viewPortDom.scrollTop});
        if (props.onScroll) props.onScroll({
            scrollLeft: viewPortDom.scrollLeft,
            scrollTop: viewPortDom.scrollTop
        })
    }, []);
    return <SheetContext.Provider value={sheetContextRef}>
        <div ref={viewPortRef}
             style={{
                 width: '100%',
                 height: '100%',
                 overflow: props.showScroller === false ? 'hidden' : 'auto',
                 boxSizing: 'border-box',
                 backgroundColor:'#fefefe',
             }} onScroll={handleScroller}>
            <div style={{
                width: $totalWidthOfContent.current,
                height: $totalHeightOfContent.current,
                boxSizing: 'border-box',
                position: 'relative', ...props.styleViewPort
            }}>
                {elements}
            </div>
        </div>
    </SheetContext.Provider>
}

function calculateBeforeViewPort(columns: Array<any>, customLength: Map<number, number> = new Map<number, number>(), defaultLength: number = 50, scrollerPosition: number = 0): CalculateBeforeViewPort {
    return columns.reduce((acc, _, index) => {
        if (acc.complete) {
            return acc;
        }
        const length = customLength.has(index) ? customLength.get(index) : defaultLength;
        const nextLength = length + acc.totalLength;
        if (nextLength > scrollerPosition) {
            acc.complete = true;
            return acc;
        }
        acc.index = index + 1;
        acc.totalLength = nextLength;
        return acc;
    }, {index: 0, totalLength: 0, complete: false});
}


function calculateInsideViewPort(data: Array<any>, indexBeforeViewPort: number, customLength: Map<number, number> = new Map<number, number>(), defaultLength: number = 50, viewPortLength: number = 50, lengthBeforeViewPort: number = 0, lengthLastIndexBeforeViewPort: number): CalculateInsideViewPort {
    return data.slice(indexBeforeViewPort).reduce<CalculateInsideViewPort>((acc, _, zeroIndex) => {
        if (acc.complete) {
            return acc;
        }
        const index = indexBeforeViewPort + zeroIndex;
        const length = customLength.has(index) ? customLength.get(index) || defaultLength : defaultLength;
        const nextLength = length + acc.totalLength;
        if ((nextLength + lengthLastIndexBeforeViewPort) > (viewPortLength + lengthBeforeViewPort)) {
            acc.lengths.set(index, length);
            acc.index = index;
            acc.totalLength = nextLength;
            acc.complete = true;
            return acc;
        }
        acc.lengths.set(index, length);
        acc.index = index;
        acc.totalLength = nextLength;
        return acc;
    }, {index: 0, totalLength: 0, complete: false, lengths: new Map<number, number>()});
}

function calculateLength(customLength: Map<number, number> = new Map<number, number>(), data: Array<any>, defaultLength: number = 0): number {
    const customLengthKeys = Array.from(customLength.keys());
    const totalCustomLength = customLengthKeys.reduce((acc, key) => acc + (customLength.has(key) ? customLength.get(key) || 0 : 0), 0);
    const totalDefaultLength = (data.length - customLengthKeys.length) * defaultLength;
    return totalDefaultLength + totalCustomLength;
}

interface CellStyleFunctionProperties extends CellRendererProps {
    focusedItem: any,
    isFocused: boolean
}

const CellRenderer = React.memo(function CellRenderer(props: CellRendererProps) {
    const sheetContext = useContext(SheetContext);
    const cellStyleFunction = props.column.cellStyleFunction || cellStyleFunctionDefaultImplementation;
    const [$emptyObserver] = useObserver(undefined);
    const [isFocused, setIsFocused] = useState(() => {
        return props.dataItem === sheetContext.current.props?.$focusedDataItem?.current;
    });
    useEffect(() => setIsFocused(props.dataItem === sheetContext.current.props?.$focusedDataItem?.current), [props.dataItem]);
    useObserverListener(sheetContext.current.props?.$focusedDataItem || $emptyObserver, () => {
        const focusedItem: any = sheetContext.current.props?.$focusedDataItem?.current;
        const isFocused = focusedItem === props.dataItem;
        setIsFocused(isFocused);
    });
    const focusedItem: any = sheetContext.current.props?.$focusedDataItem?.current;
    const cellStyle = cellStyleFunction({isFocused, focusedItem, ...props});
    const CellComponent = props.column.cellComponent || CellComponentDefaultImplementation;

    return <div

        style={{
            position: 'absolute',
            height: props.height,
            width: props.width,
            top: props.top,
            left: props.left,
            borderBottom: BORDER,
            borderRight: BORDER,
            boxSizing: 'border-box',
            overflow: 'visible',
            display: 'flex',
            flexDirection: 'column',
            ...props.style
        }} onClick={(event: SyntheticEvent<HTMLDivElement>) => {
        if (sheetContext.current?.props?.onCellClicked) {
            sheetContext.current.props.onCellClicked({
                event,
                dataItem: props.dataItem,
                rowIndex: props.rowIndex,
                columnIndex: props.colIndex,
                column: props.column,
                value: props.value,
                dataSource: props.dataSource
            });
        }
    }}
        onClickCapture={(event: SyntheticEvent<HTMLDivElement>) => {
            if (sheetContext.current?.props?.onCellClickedCapture) {
                sheetContext.current.props.onCellClickedCapture({
                    event,
                    dataItem: props.dataItem,
                    rowIndex: props.rowIndex,
                    columnIndex: props.colIndex,
                    column: props.column,
                    value: props.value,
                    dataSource: props.dataSource
                });
            }
        }}
        onDoubleClick={(event: SyntheticEvent<HTMLDivElement>) => {
            if (sheetContext.current?.props?.onCellDoubleClicked) {
                sheetContext.current?.props?.onCellDoubleClicked({
                    event,
                    dataItem: props.dataItem,
                    rowIndex: props.rowIndex,
                    columnIndex: props.colIndex,
                    column: props.column,
                    value: props.value,
                    dataSource: props.dataSource
                });
            }
        }}
        onDoubleClickCapture={(event: SyntheticEvent<HTMLDivElement>) => {
            if (sheetContext.current?.props?.onCellDoubleClickedCapture) {
                sheetContext.current?.props?.onCellDoubleClickedCapture({
                    event,
                    dataItem: props.dataItem,
                    rowIndex: props.rowIndex,
                    columnIndex: props.colIndex,
                    column: props.column,
                    value: props.value,
                    dataSource: props.dataSource
                });
            }
        }}
    >
        <CellComponent
            value={props.value}
            column={props.column}
            dataItem={props.dataItem}
            dataSource={props.dataSource}
            rowIndex={props.rowIndex}
            colIndex={props.colIndex}
            cellStyle={cellStyle}
            rowSpan={props.rowSpan}
            colSpan={props.colSpan}
        />

    </div>
});


function calculateCellToBeSkippedDuringRendering(param: { lastColIndexBeforeViewPort: number; data: Array<any>; lastRowIndexBeforeViewPort: number; columns: Array<Column>; lastRowIndexInsideViewPort: number; lastColIndexInsideViewPort: number }) {
    const {
        lastColIndexBeforeViewPort,
        data,
        lastRowIndexBeforeViewPort,
        columns,
        lastRowIndexInsideViewPort,
        lastColIndexInsideViewPort
    } = param;
    // first we iterate over the rows
    const cellsToBeMerged: Map<number, Set<number>> = new Map<number, Set<number>>();
    const cellsThatRequestForOtherCellsToBeMerged: Map<number, Set<number>> = new Map<number, Set<number>>();
    for (let rowIndex = lastRowIndexBeforeViewPort; rowIndex < lastRowIndexInsideViewPort; rowIndex++) {
        for (let colIndex = lastColIndexBeforeViewPort; colIndex < lastColIndexInsideViewPort; colIndex++) {
            if (cellsToBeMerged.has(rowIndex) && (cellsToBeMerged.get(rowIndex) || new Set()).has(colIndex)) {
                continue;
            }
            const column: Column = columns[colIndex];
            const dataItem = data[rowIndex];

            const cellSpanFunction = column.cellSpanFunction || cellSpanFunctionDefaultImplementation;

            const cellSpan = cellSpanFunction({
                data,
                dataItem,
                columns,
                lastColIndexBeforeViewPort,
                lastColIndexInsideViewPort,
                lastRowIndexInsideViewPort,
                lastRowIndexBeforeViewPort,
                rowIndex,
                colIndex,
                getCellValue: getCellValue(data, column)
            });
            const colSpan = cellSpan.colSpan || 1;
            const rowSpan = cellSpan.rowSpan || 1;
            if (colSpan > 1 || rowSpan > 1) {
                // ok this is expanding lets the cell that is not supposed to be visible;
                if (!cellsThatRequestForOtherCellsToBeMerged.has(rowIndex)) {
                    cellsThatRequestForOtherCellsToBeMerged.set(rowIndex, new Set());
                }
                (cellsThatRequestForOtherCellsToBeMerged.get(rowIndex) || new Set).add(colIndex);
                for (let rowIndexToMerge = rowIndex; rowIndexToMerge < rowIndex + rowSpan; rowIndexToMerge++) {
                    for (let colIndexToMerge = colIndex; colIndexToMerge < colIndex + colSpan; colIndexToMerge++) {
                        if (!cellsToBeMerged.has(rowIndexToMerge)) {
                            cellsToBeMerged.set(rowIndexToMerge, new Set());
                        }
                        (cellsToBeMerged.get(rowIndexToMerge) || new Set()).add(colIndexToMerge);
                    }
                }
            }
        }
    }

    cellsThatRequestForOtherCellsToBeMerged.forEach((colIds, rowId) => {
        colIds.forEach(colId => {
            (cellsToBeMerged.get(rowId) || new Set()).delete(colId);
        })
    });

    return cellsToBeMerged;
}

function getCellValue(data: Array<any>, column: Column) {
    return (rowIndex: number, colIndex: number) => {
        const dataItem = data[rowIndex];
        const dataItemToValue = column.dataItemToValue || dataItemToValueDefaultImplementation;
        return dataItemToValue({dataItem, column, colIndex, dataSource: data, rowIndex});
    };
}

function renderComponent({
                             numberOfRowInsideViewPort,
                             numberOfRowBeforeViewPort,
                             numberOfColInsideViewPort,
                             numberOfColBeforeViewPort,
                             setElements,
                             data,
                             columns,
                             hideLeftColumnIndex
                         }: RenderComponentProps): void {


    const heightsOfRowInsideViewPort = numberOfRowInsideViewPort.lengths;
    const totalHeightBeforeViewPort = numberOfRowBeforeViewPort.totalLength;
    const lastRowIndexBeforeViewPort = numberOfRowBeforeViewPort.index;
    const lastRowIndexInsideViewPort = numberOfRowInsideViewPort.lengths.size + lastRowIndexBeforeViewPort;
    const widthsOfColInsideViewPort = numberOfColInsideViewPort.lengths;
    const lastColIndexBeforeViewPort = numberOfColBeforeViewPort.index;
    const totalWidthBeforeViewPort = numberOfColBeforeViewPort.totalLength;
    const lastColIndexInsideViewPort = numberOfColInsideViewPort.lengths.size + lastColIndexBeforeViewPort;


    const cellToBeSkippedDuringRendering: Map<number, Set<number>> = calculateCellToBeSkippedDuringRendering({
        lastRowIndexBeforeViewPort,
        lastColIndexBeforeViewPort,
        lastRowIndexInsideViewPort,
        lastColIndexInsideViewPort,
        columns,
        data
    });

    const {elements} = Array.from({length: heightsOfRowInsideViewPort.size}).reduce<RowAccumulator>((acc, _, rowIndexInsideViewPort) => {
        const rowIndex = lastRowIndexBeforeViewPort + rowIndexInsideViewPort;
        const rowHeight = heightsOfRowInsideViewPort.get(rowIndex) || 0;

        const {elements} = Array.from({length: widthsOfColInsideViewPort.size}).reduce<ColAccumulator>((colAcc, _, colIndexInsideViewPort) => {
            const colIndex = lastColIndexBeforeViewPort + colIndexInsideViewPort;
            const colWidth = widthsOfColInsideViewPort.get(colIndex) || 0;
            if ((cellToBeSkippedDuringRendering.get(rowIndex) || new Set()).has(colIndex)) {
                colAcc.left = colAcc.left + colWidth;
                return colAcc;
            }

            const column = columns[colIndex];
            const dataItem = data[rowIndex];
            const dataItemToValue = column.dataItemToValue || dataItemToValueDefaultImplementation;
            const value = dataItemToValue({dataItem, column, colIndex, dataSource: data, rowIndex});

            const cellSpanFunction = column.cellSpanFunction || cellSpanFunctionDefaultImplementation;
            const cellSpan = cellSpanFunction({
                data,
                dataItem,
                columns,
                lastRowIndexInsideViewPort,
                lastColIndexInsideViewPort,
                lastRowIndexBeforeViewPort,
                lastColIndexBeforeViewPort,
                rowIndex,
                colIndex,
                getCellValue: getCellValue(data, column)
            });
            const colSpan: number = cellSpan.colSpan || 1;
            const rowSpan: number = cellSpan.rowSpan || 1;
            let accumulatedRowHeight = rowHeight;
            let accumulatedColWidth = colWidth;
            if (colSpan > 1 || rowSpan > 1) {
                accumulatedRowHeight = Array.from({length: rowSpan}).reduce((acc: number, _, index: number) => {
                    return acc + (heightsOfRowInsideViewPort.get(index + rowIndex) || 0);
                }, 0);
                accumulatedColWidth = Array.from({length: colSpan}).reduce((acc: number, _, index: number) => {
                    return acc + (widthsOfColInsideViewPort.get(index + colIndex) || 0);
                }, 0);
            }
            if(colIndex > hideLeftColumnIndex){
                colAcc.elements.push(<CellRenderer key={`${rowIndex}-${colIndex}`}
                                                   rowIndex={rowIndex}
                                                   colIndex={colIndex}
                                                   top={acc.top}
                                                   width={accumulatedColWidth}
                                                   dataSource={data}
                                                   dataItem={dataItem}
                                                   value={value}
                                                   column={column}
                                                   left={colAcc.left}
                                                   height={accumulatedRowHeight}
                                                   colSpan={colSpan}
                                                   rowSpan={rowSpan}

                />);
            }

            colAcc.left = colAcc.left + colWidth;
            return colAcc;
        }, {elements: [], left: totalWidthBeforeViewPort});

        acc.top = acc.top + rowHeight;
        acc.elements = [...acc.elements, ...elements];
        return acc;
    }, {elements: [], top: totalHeightBeforeViewPort});
    setElements(elements);
}

export function dataItemToValueDefaultImplementation(props: DataItemToValueProps) {
    if (props.dataItem) {
        const value = props.dataItem[props.column.field];
        return value?.toString()
    }
    return '';
}