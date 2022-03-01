import React, {useEffect, useRef, useState} from "react";
import {useObserver, useObserverListener} from "react-hook-useobserver";


function renderComponent({
                             numberOfRowInsideViewPort,
                             numberOfRowBeforeViewPort,
                             numberOfColInsideViewPort,
                             numberOfColBeforeViewPort,
                             setElements
                         }) {
    const {
        rowIndex: totalRowInsideViewPort,
        totalHeight: totalHeightInsideViewPort,
        heights: heightsOfRowInsideViewPort
    } = numberOfRowInsideViewPort;
    const {rowIndex: totalRowBeforeViewPort, totalHeight: totalHeightBeforeViewPort} = numberOfRowBeforeViewPort;

    const {
        colIndex: totalColInsideViewPort,
        totalWidth: totalWidthInsideViewPort,
        widths: widthsOfColInsideViewPort
    } = numberOfColInsideViewPort;
    const {colIndex: totalColBeforeViewPort, totalWidth: totalWidthBeforeViewPort} = numberOfColBeforeViewPort;

    const {elements} = Array.from({length: totalRowInsideViewPort}).reduce((acc, _, rowIndexInsideViewPort) => {
        const rowIndex = totalRowBeforeViewPort + rowIndexInsideViewPort;
        const rowHeight = heightsOfRowInsideViewPort[rowIndex];

        const {elements} = Array.from({length: totalColInsideViewPort}).reduce((colAcc,_,colIndexInsideViewPort) => {
            const colIndex = totalColBeforeViewPort + colIndexInsideViewPort;
            const colWidth = widthsOfColInsideViewPort[colIndex];

            colAcc.elements.push(<CellRenderer key={`${rowIndex}-${colIndex}`} rowIndex={rowIndex} colIndex={colIndex} top={acc.top}
                                               width={colWidth}
                                               left={colAcc.left} height={rowHeight}/>);
            colAcc.left = colAcc.left + colWidth;
            return colAcc;
        },{elements:[],left:totalColBeforeViewPort});

        acc.top = acc.top + rowHeight;
        acc.elements.push(elements);
        return acc;
    }, {elements: [], top: totalHeightBeforeViewPort});
    setElements(elements.flat());
}

export function Sheet({data, columns}) {
    const [$defaultRowHeight, setDefaultRowHeight] = useObserver(20);
    const [$defaultColWidth, setDefaultColWidth] = useObserver(200);
    const [$customRowHeight, setCustomRowHeight] = useObserver([]);
    const [$customColWidth, setCustomColWidth] = useObserver([]);
    const [$viewPortDimension, setViewPortDimension] = useObserver({width: 0, height: 0});
    const [$scrollerPosition, setScrollerPosition] = useObserver({left: 0, top: 0});
    const [elements, setElements] = useState([]);
    const [$totalWidthOfContent, setTotalWidthOfContent] = useObserver(() => {
        const totalColumnFixWidth = $customColWidth.current.reduce((acc, value, index) => acc + value, 0);
        const totalDefaultColumnWidth = (columns.length - $customColWidth.current.length) * $defaultColWidth.current;
        return totalDefaultColumnWidth + totalColumnFixWidth;
    });

    useObserverListener($customColWidth, customColWidth => {
        const totalColumnFixWidth = customColWidth.reduce((acc, value, index) => acc + value, 0);
        const totalDefaultColumnWidth = (columns.length - customColWidth.length) * $defaultColWidth.current;
        setTotalWidthOfContent(totalDefaultColumnWidth + totalColumnFixWidth);
    });

    const [$totalHeightOfContent, setTotalHeightOfContent] = useObserver(() => {
        const totalRowFixWidth = $customRowHeight.current.reduce((acc, value, index) => acc + value, 0);
        const totalDefaultRowHeight = (data.length - $customRowHeight.current.length) * $defaultRowHeight.current;
        return totalRowFixWidth + totalDefaultRowHeight;
    });

    useObserverListener($customRowHeight, customRowHeight => {
        const totalRowFixWidth = customRowHeight.reduce((acc, value, index) => acc + value, 0);
        const totalDefaultRowHeight = (data.length - customRowHeight.length) * $defaultRowHeight.current;
        setTotalHeightOfContent(totalRowFixWidth + totalDefaultRowHeight);
    });

    const viewPortRef = useRef();

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
        const viewPortDimension = $viewPortDimension.current;
        const scrollerPosition = $scrollerPosition.current;
        const defaultRowHeight = $defaultRowHeight.current;
        const defaultColWidth = $defaultColWidth.current;
        const customRowHeight = $customRowHeight.current;
        const customColWidth = $customColWidth.current;


        const numberOfColBeforeViewPort = columns.reduce((acc, _, index) => {
            if (acc.complete) {
                return acc;
            }
            const width = customColWidth[index] ? customColWidth[index] : defaultColWidth;
            const nextWidth = width + acc.totalWidth;
            if (nextWidth > scrollerPosition.left) {
                acc.complete = true;
                return acc;
            }
            acc.colIndex = index;
            acc.totalWidth = nextWidth;
            return acc;
        }, {colIndex: 0, totalWidth: 0, complete: false});
        console.log(numberOfColBeforeViewPort);

        const numberOfColInsideViewPort = columns.slice(numberOfColBeforeViewPort.colIndex).reduce((acc, _, zeroIndex) => {
            if (acc.complete) {
                return acc;
            }
            const index = numberOfColBeforeViewPort.colIndex + zeroIndex;
            const width = customColWidth[index] ? customColWidth[index] : defaultColWidth;
            const nextWidth = width + acc.totalWidth;

            if (nextWidth > viewPortDimension.width) {
                acc.widths[index] = width;
                acc.colIndex = index;
                acc.totalWidth = nextWidth;
                acc.complete = true;
                return acc;
            }
            acc.widths[index] = width;
            acc.colIndex = index;
            acc.totalWidth = nextWidth;
            return acc;
        }, {colIndex: 0, totalWidth: 0, complete: false, widths: []});

        const numberOfRowBeforeViewPort = data.reduce((acc, _, index) => {
            if (acc.complete) {
                return acc;
            }
            const height = customRowHeight[index] ? customRowHeight[index] : defaultRowHeight;
            const nextHeight = height + acc.totalHeight;
            if (nextHeight > scrollerPosition.top) {
                acc.complete = true;
                return acc;
            }
            acc.rowIndex = index;
            acc.totalHeight = nextHeight;
            return acc;
        }, {rowIndex: 0, totalHeight: 0, complete: false});

        const numberOfRowInsideViewPort = data.slice(numberOfRowBeforeViewPort.rowIndex).reduce((acc, _, zeroIndex) => {
            if (acc.complete) {
                return acc;
            }
            const index = numberOfRowBeforeViewPort.rowIndex + zeroIndex;
            const height = customRowHeight[index] ? customRowHeight[index] : defaultRowHeight;
            const nextHeight = height + acc.totalHeight;
            if (nextHeight > viewPortDimension.height) {
                acc.heights[index] = height;
                acc.rowIndex = index;
                acc.totalHeight = nextHeight;
                acc.complete = true;
                return acc;
            }
            acc.heights[index] = height;
            acc.rowIndex = index;
            acc.totalHeight = nextHeight;
            return acc;
        }, {rowIndex: 0, totalHeight: 0, complete: false, heights: []});

        renderComponent({
            numberOfRowInsideViewPort,
            numberOfRowBeforeViewPort,
            numberOfColInsideViewPort,
            numberOfColBeforeViewPort,
            setElements
        });

    });
    return <div ref={viewPortRef} style={{width: '100%', height: '100%', overflow: 'auto', boxSizing: 'border-box'}}>
        <div style={{
            width: $totalWidthOfContent.current,
            height: $totalHeightOfContent.current,
            boxSizing: 'border-box',
            backgroundColor: '#dddddd',
            position: 'relative'
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
    return <div style={{position: 'absolute', height, width, top, left, border: '1px solid #000',boxSizing:'border-box'}}>
        {`r:${rowIndex} c:${colIndex}`}
    </div>
});