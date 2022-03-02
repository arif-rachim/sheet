import React, {useEffect, useRef, useState} from "react";
import {useObserver, useObserverListener} from "react-hook-useobserver";

function calculateBeforeViewPort(columns, customLength, defaultLength, scrollerPosition) {
    return columns.reduce((acc, _, index) => {
        if (acc.complete) {
            return acc;
        }
        const length = customLength[index] ? customLength[index] : defaultLength;
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

const SCROLLER_SIZE = 30;

function calculateInsideViewPort(data, indexBeforeViewPort, customLength, defaultLength, viewPortLength) {

    viewPortLength = viewPortLength + SCROLLER_SIZE;
    return data.slice(indexBeforeViewPort).reduce((acc, _, zeroIndex) => {
        if (acc.complete) {
            return acc;
        }
        const index = indexBeforeViewPort + zeroIndex;
        const length = customLength[index] ? customLength[index] : defaultLength;
        const nextLength = length + acc.totalLength;

        if (nextLength > viewPortLength) {
            acc.lengths[index] = length;
            acc.index = index;
            acc.totalLength = nextLength;
            acc.complete = true;
            return acc;
        }
        acc.lengths[index] = length;
        acc.index = index;
        acc.totalLength = nextLength;
        return acc;
    }, {index: 0, totalLength: 0, complete: false, lengths: {}});
}

function calculateLength(customLength, data, defaultLength) {
    const totalCustomLength = Object.keys(customLength).reduce((acc, key) => acc + customLength[key], 0);
    const totalDefaultLength = (data.length - Object.keys(customLength).length) * defaultLength;
    return totalDefaultLength + totalCustomLength;
}

export function Sheet({data, columns,styleContainer,styleViewPort,columnsLength={},rowsLength={}}) {
    const [$defaultRowHeight, ] = useObserver(20);
    const [$defaultColWidth, ] = useObserver(70);
    const [$customRowHeight, ] = useObserver(rowsLength);
    const [$customColWidth, ] = useObserver(columnsLength);
    const [$viewPortDimension, setViewPortDimension] = useObserver({width: 0, height: 0});
    const [$scrollerPosition, setScrollerPosition] = useObserver({left: 0, top: 0});
    const [elements, setElements] = useState([]);

    const [$totalWidthOfContent, setTotalWidthOfContent] = useObserver(calculateLength($customColWidth.current, columns, $defaultColWidth.current));
    useObserverListener($customColWidth, () => setTotalWidthOfContent(calculateLength($customColWidth.current, columns, $defaultColWidth.current)));

    const [$totalHeightOfContent, setTotalHeightOfContent] = useObserver(calculateLength($customRowHeight.current, data, $defaultRowHeight.current));
    useObserverListener($customRowHeight, () => setTotalHeightOfContent(calculateLength($customRowHeight.current, data, $defaultRowHeight.current)));

    const viewPortRef = useRef({});

    useEffect(() => {
        const viewPortDom = viewPortRef.current;
        const {offsetWidth, offsetHeight} = viewPortDom;
        setViewPortDimension({width: offsetWidth, height: offsetHeight});
        const onScroller = () => setScrollerPosition({left: viewPortDom.scrollLeft, top: viewPortDom.scrollTop});
        viewPortDom.addEventListener('scroll', onScroller);
        return function deregister() {
            viewPortDom.removeEventListener('scroll', onScroller);
        }
    }, []);

    useObserverListener([$viewPortDimension, $scrollerPosition, $defaultRowHeight, $defaultColWidth, $customRowHeight, $customColWidth], () => {

        const scrollerPosition = $scrollerPosition.current;
        const defaultRowHeight = $defaultRowHeight.current;
        const defaultColWidth = $defaultColWidth.current;
        const customRowHeight = $customRowHeight.current;
        const customColWidth = $customColWidth.current;

        const numberOfColBeforeViewPort = calculateBeforeViewPort(columns, customColWidth, defaultColWidth, scrollerPosition.left);
        const numberOfColInsideViewPort = calculateInsideViewPort(columns, numberOfColBeforeViewPort.index, customColWidth, defaultColWidth, $viewPortDimension.current.width);
        const numberOfRowBeforeViewPort = calculateBeforeViewPort(data, customRowHeight, defaultRowHeight, scrollerPosition.top);
        const numberOfRowInsideViewPort = calculateInsideViewPort(data, numberOfRowBeforeViewPort.index, customRowHeight, defaultRowHeight, $viewPortDimension.current.height);

        renderComponent({
            numberOfRowInsideViewPort,
            numberOfRowBeforeViewPort,
            numberOfColInsideViewPort,
            numberOfColBeforeViewPort,
            setElements
        });
    });
    return <div ref={viewPortRef} style={{width: '100%', height: '100%', overflow: 'auto', boxSizing: 'border-box',...styleContainer}}>
        <div style={{
            width: $totalWidthOfContent.current,
            height: $totalHeightOfContent.current,
            boxSizing: 'border-box',
            backgroundColor: '#dddddd',
            position: 'relative',...styleViewPort
        }}>
            {elements}
        </div>
    </div>
}

const CellRenderer = React.memo(function CellRenderer({
                                                          height = 0,
                                                          width = 0,
                                                          top = 0,
                                                          left = 0,
                                                          rowIndex = 0,
                                                          colIndex = 0
                                                      }) {
    top = top || 0;
    return <div
        style={{position: 'absolute', height, width, top, left, border: '1px solid #000', boxSizing: 'border-box',overflow:'hidden'}}>
        {`r:${rowIndex} c:${colIndex}`}
    </div>
});

function renderComponent({
                             numberOfRowInsideViewPort,
                             numberOfRowBeforeViewPort,
                             numberOfColInsideViewPort,
                             numberOfColBeforeViewPort,
                             setElements
                         }) {
    const {
        index: lastRowIndexInsideViewPOrt,
        totalLength: totalHeightInsideViewPort,
        lengths: heightsOfRowInsideViewPort
    } = numberOfRowInsideViewPort;
    const {index: lastRowIndexBeforeViewPort, totalLength: totalHeightBeforeViewPort} = numberOfRowBeforeViewPort;

    const {
        index: lastColIndexInsideViewPort,
        totalLength: totalWidthInsideViewPort,
        lengths: widthsOfColInsideViewPort
    } = numberOfColInsideViewPort;
    const {index: lastColIndexBeforeViewPort, totalLength: totalWidthBeforeViewPort} = numberOfColBeforeViewPort;

    const {elements} = Array.from({length: Object.keys(heightsOfRowInsideViewPort).length}).reduce((acc, _, rowIndexInsideViewPort) => {
        const rowIndex = lastRowIndexBeforeViewPort + rowIndexInsideViewPort;
        const rowHeight = heightsOfRowInsideViewPort[rowIndex];

        const {elements} = Array.from({length: Object.keys(widthsOfColInsideViewPort).length}).reduce((colAcc, _, colIndexInsideViewPort) => {
            const colIndex = lastColIndexBeforeViewPort + colIndexInsideViewPort;
            const colWidth = widthsOfColInsideViewPort[colIndex];
            if(colAcc.left === 70 && colIndex === 0){
                debugger;
            }
            colAcc.elements.push(<CellRenderer key={`${rowIndex}-${colIndex}`} rowIndex={rowIndex} colIndex={colIndex}
                                               top={acc.top}
                                               width={colWidth}
                                               left={colAcc.left} height={rowHeight}/>);
            colAcc.left = colAcc.left + colWidth;
            return colAcc;
        }, {elements: [], left: totalWidthBeforeViewPort});
        acc.top = acc.top + rowHeight;
        acc.elements.push(elements);
        return acc;
    }, {elements: [], top: totalHeightBeforeViewPort});
    const flatElements = elements.flat();
    setElements(flatElements);
}