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
const DEFAULT_HEIGHT = 25;
const DEFAULT_WIDTH = 70;


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

export interface Column {
    field: string,
    width: number,
    cellComponent?: React.FC<CellComponentStyledProps>,
    cellStyleFunction?: (props: CellComponentProps) => CSSProperties,
    dataItemToValue?: (props: DataItemToValueProps) => string
}

export interface HeaderCellComponentProps {
    field: string,
    title: string,
    column: Column,
    colIndex: number,
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
    defaultColWidth?: number,
    defaultRowHeight?: number,
    onCellClicked?: CellClickedCallback,
    onCellClickedCapture?: CellClickedCallback,
    onCellDoubleClicked?: CellClickedCallback,
    onCellDoubleClickedCapture?: CellClickedCallback,
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
    value: any
}

interface CellRendererProps extends CellComponentProps {
    height: number,
    width: number,
    top: number,
    left: number,
    style?: CSSProperties,
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
    setElements: React.Dispatch<React.SetStateAction<React.ReactElement[]>>
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
    props?:SheetProperties<any>
}

const SheetContext = createContext<MutableRefObject<SheetContextType>>({current: {props:undefined}});

export default function Sheet<DataItem>(props: SheetProperties<DataItem>) {

    const sheetContextRef = useRef<SheetContextType>({props});
    sheetContextRef.current = {props};
    const [$reRender, setReRender] = useObserver(new Date());
    const forceUpdate = useCallback(() => setReRender(new Date()), []);
    useEffect(() => {
        forceUpdate();
    }, [props.data]);
    const {$customColWidth, $customRowHeight} = props;
    const [$defaultRowHeight,] = useObserver(props.defaultRowHeight || DEFAULT_HEIGHT);
    const [$defaultColWidth,] = useObserver(props.defaultColWidth || DEFAULT_WIDTH);
    const [$viewPortDimension, setViewPortDimension] = useObserver({width: 0, height: 0});
    const [$scrollerPosition, setScrollerPosition] = useObserver({
        left: props.$scrollLeft?.current || 0,
        top: props.$scrollTop?.current || 0
    });
    const [elements, setElements] = useState(new Array<ReactElement>());
    const [$emptyObserver] = useObserver(0);
    const [$emptyMapObserver] = useObserver(new Map<number, number>());
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

    useEffect(() => {
        setTotalHeightOfContent(calculateLength($customRowHeight?.current, props.data, $defaultRowHeight.current))
    }, [props.data]);

    const viewPortRef = useRef(defaultDom);

    useEffect(() => {
        const viewPortDom = viewPortRef.current;
        const {offsetWidth, offsetHeight} = viewPortDom;
        setViewPortDimension({width: offsetWidth, height: offsetHeight});
    }, []);

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
                 ...props.styleContainer
             }} onScroll={handleScroller}>
            <div style={{
                width: $totalWidthOfContent.current,
                height: $totalHeightOfContent.current,
                boxSizing: 'border-box',
                backgroundColor: '#f6f6f6',
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

interface CellStyleFunctionProperties extends CellRendererProps{
    focusedItem:any,
    isFocused:boolean
}

const CellRenderer = React.memo(function CellRenderer(props: CellRendererProps) {
    const sheetContext = useContext(SheetContext);
    const cellStyleFunction = props.column.cellStyleFunction || cellStyleFunctionDefaultImplementation;
    const [$emptyObserver] = useObserver(undefined);
    const [isFocused,setIsFocused] = useState(() => {
        return props.dataItem === sheetContext.current.props?.$focusedDataItem?.current;
    });
    useEffect(() => setIsFocused(props.dataItem === sheetContext.current.props?.$focusedDataItem?.current),[props.dataItem]);
    useObserverListener(sheetContext.current.props?.$focusedDataItem || $emptyObserver,() => {
        const focusedItem:any = sheetContext.current.props?.$focusedDataItem?.current;
        const isFocused = focusedItem === props.dataItem;
        setIsFocused(isFocused);
    });
    const focusedItem:any = sheetContext.current.props?.$focusedDataItem?.current;
    const cellStyle = cellStyleFunction({isFocused,focusedItem,...props});
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
        />

    </div>
});


function renderComponent({
                             numberOfRowInsideViewPort,
                             numberOfRowBeforeViewPort,
                             numberOfColInsideViewPort,
                             numberOfColBeforeViewPort,
                             setElements,
                             data,
                             columns
                         }: RenderComponentProps): void {

    const heightsOfRowInsideViewPort = numberOfRowInsideViewPort.lengths;
    const totalHeightBeforeViewPort = numberOfRowBeforeViewPort.totalLength;
    const lastRowIndexBeforeViewPort = numberOfRowBeforeViewPort.index;
    const widthsOfColInsideViewPort = numberOfColInsideViewPort.lengths;
    const lastColIndexBeforeViewPort = numberOfColBeforeViewPort.index;
    const totalWidthBeforeViewPort = numberOfColBeforeViewPort.totalLength;

    const {elements} = Array.from({length: heightsOfRowInsideViewPort.size}).reduce<RowAccumulator>((acc, _, rowIndexInsideViewPort) => {
        const rowIndex = lastRowIndexBeforeViewPort + rowIndexInsideViewPort;
        const rowHeight = heightsOfRowInsideViewPort.get(rowIndex) || 0;
        const {elements} = Array.from({length: widthsOfColInsideViewPort.size}).reduce<ColAccumulator>((colAcc, _, colIndexInsideViewPort) => {
            const colIndex = lastColIndexBeforeViewPort + colIndexInsideViewPort;
            const colWidth = widthsOfColInsideViewPort.get(colIndex) || 0;
            const column = columns[colIndex];
            const dataItem = data[rowIndex];
            const dataItemToValue = column.dataItemToValue || dataItemToValueDefaultImplementation;
            const value = dataItemToValue({dataItem, column, colIndex, dataSource: data, rowIndex});
            colAcc.elements.push(<CellRenderer key={`${rowIndex}-${colIndex}`} rowIndex={rowIndex} colIndex={colIndex}
                                               top={acc.top}
                                               width={colWidth}
                                               dataSource={data}
                                               dataItem={dataItem}
                                               value={value}
                                               column={column}
                                               left={colAcc.left} height={rowHeight}/>);
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
    const value = props.dataItem[props.column.field];
    return value?.toString()
}