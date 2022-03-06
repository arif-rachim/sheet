import React, {CSSProperties, ReactElement, useCallback, useEffect, useRef, useState} from "react";
import {useObserver, useObserverListener} from "react-hook-useobserver";
import {Observer} from "react-hook-useobserver/lib/useObserver";
import {Vertical} from "react-hook-components";

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
    cellComponent? : React.FC<CellComponentProps>,
}

export interface HeaderCellComponentProps{
    field : string,
    title: string,
    column: Column,
    colIndex: number,
}


type ScrollListener = (event: { scrollLeft: number, scrollTop: number, viewportWidth: number, viewportHeight: number }) => void;
const BORDER = '1px solid rgba(0,0,0,0.1)';
const DEFAULT_HEIGHT = 25;
const DEFAULT_WIDTH = 70;

interface SheetProperties<DataItem> {
    data: Array<DataItem>,
    columns: Array<Column>,
    styleContainer?: CSSProperties,
    styleViewPort?: CSSProperties,
    $customColWidth?: Observer<Map<number, number>>,
    $customRowHeight?: Observer<Map<number, number>>,
    onScroll?: ScrollListener,
    $scrollLeft? : Observer<number>,
    $scrollTop? : Observer<number>,
    showScroller? : boolean,
    defaultColWidth? : number,
    defaultRowHeight? : number
        
}

export interface CellComponentProps{
    dataSource: Array<any>,
    dataItem: any,
    value: any,
    column: Column,
    rowIndex: number,
    colIndex: number,
}

interface CellRendererProps extends CellComponentProps{
    height: number,
    width: number,
    top: number,
    left: number,
    style?: CSSProperties,

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
    setElements: React.Dispatch<React.SetStateAction<React.ReactElement<any, string | React.JSXElementConstructor<any>>[]>>
}

const defaultDom = document.createElement('div');
const DefaultCellComponent : React.FC<CellComponentProps> = ({value}) => <Vertical style={{padding:'0 5px'}}>{value}</Vertical>

export default function Sheet<DataItem>(props: SheetProperties<DataItem>) {
    const [$reRender,setReRender] = useObserver(new Date());
    const forceUpdate = useCallback(() => setReRender(new Date()),[]);
    useEffect(() => forceUpdate(),[props.data]);
    const {$customColWidth, $customRowHeight} = props;
    const [$defaultRowHeight,] = useObserver(props.defaultRowHeight || DEFAULT_HEIGHT);
    const [$defaultColWidth,] = useObserver(props.defaultColWidth ||  DEFAULT_WIDTH);
    const [$viewPortDimension, setViewPortDimension] = useObserver({width: 0, height: 0});
    const [$scrollerPosition, setScrollerPosition] = useObserver({left: props.$scrollLeft?.current || 0, top: props.$scrollTop?.current || 0});
    const [elements, setElements] = useState(new Array<ReactElement>());
    const [$emptyObserver] = useObserver(0);
    const [$emptyMapObserver] = useObserver(new Map<number,number>());
    useObserverListener([props.$scrollTop||$emptyObserver,props.$scrollLeft||$emptyObserver],() => {
        const left = props.$scrollLeft?.current||0;
        const top = props.$scrollTop?.current || 0;
        viewPortRef.current.scrollLeft = left;
        viewPortRef.current.scrollTop = top;
        setScrollerPosition({left, top})
    })
    const [$totalWidthOfContent, setTotalWidthOfContent] = useObserver(calculateLength($customColWidth?.current, props.columns, $defaultColWidth.current));
    useObserverListener($customColWidth || $emptyMapObserver, () => setTotalWidthOfContent(calculateLength($customColWidth?.current, props.columns, $defaultColWidth.current)));

    const [$totalHeightOfContent, setTotalHeightOfContent] = useObserver(calculateLength($customRowHeight?.current, props.data, $defaultRowHeight.current));
    useObserverListener($customRowHeight || $emptyMapObserver, () => setTotalHeightOfContent(calculateLength($customRowHeight?.current, props.data, $defaultRowHeight.current)));

    const viewPortRef = useRef(defaultDom);

    useEffect(() => {
        const viewPortDom = viewPortRef.current;
        const {offsetWidth, offsetHeight} = viewPortDom;
        setViewPortDimension({width: offsetWidth, height: offsetHeight});
    }, []);

    useObserverListener([$reRender,$viewPortDimension, $scrollerPosition, $defaultRowHeight, $defaultColWidth, $customRowHeight||$emptyMapObserver, $customColWidth||$emptyMapObserver], () => {

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
            scrollTop: viewPortDom.scrollTop,
            viewportHeight: viewPortDom.offsetWidth,
            viewportWidth: viewPortDom.offsetHeight
        })
    }, []);
    return <div ref={viewPortRef}
                style={{
                    width: '100%',
                    height: '100%',
                    overflow: props.showScroller === false ? 'hidden' : 'auto',
                    boxSizing:'border-box',
                    ...props.styleContainer
                }} onScroll={handleScroller}>
        <div style={{
            width: $totalWidthOfContent.current,
            height: $totalHeightOfContent.current,
            boxSizing:'border-box',
            backgroundColor: '#dddddd',
            position: 'relative', ...props.styleViewPort
        }}>
            {elements}
        </div>
    </div>
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

const CellRenderer = React.memo(function CellRenderer(props: CellRendererProps) {
    const CellComponent = props.column.cellComponent || DefaultCellComponent;
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
            display:'flex',
            flexDirection:'column',
            ...props.style
        }}>
        <CellComponent
            value={props.value}
            column={props.column}
            dataItem={props.dataItem}
            dataSource={props.dataSource}
            rowIndex={props.rowIndex}
            colIndex={props.colIndex}
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

    const {
        lengths: heightsOfRowInsideViewPort
    } = numberOfRowInsideViewPort;
    const {index: lastRowIndexBeforeViewPort, totalLength: totalHeightBeforeViewPort} = numberOfRowBeforeViewPort;

    const {
        lengths: widthsOfColInsideViewPort
    } = numberOfColInsideViewPort;
    const {index: lastColIndexBeforeViewPort, totalLength: totalWidthBeforeViewPort} = numberOfColBeforeViewPort;


    const {elements} = Array.from({length: heightsOfRowInsideViewPort.size}).reduce<RowAccumulator>((acc, _, rowIndexInsideViewPort) => {
        const rowIndex = lastRowIndexBeforeViewPort + rowIndexInsideViewPort;
        const rowHeight = heightsOfRowInsideViewPort.get(rowIndex) || 0;
        const {elements} = Array.from({length: widthsOfColInsideViewPort.size}).reduce<ColAccumulator>((colAcc, _, colIndexInsideViewPort) => {
            const colIndex = lastColIndexBeforeViewPort + colIndexInsideViewPort;
            const colWidth = widthsOfColInsideViewPort.get(colIndex) || 0;
            const column = columns[colIndex];
            const dataItem = data[rowIndex];
            const value = dataItem[column.field];
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