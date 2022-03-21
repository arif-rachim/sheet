import {Horizontal, Vertical} from "react-hook-components";
import Sheet, {CellComponentProps, Column, dataItemToValueDefaultImplementation} from "./Sheet";
import {ObserverValue, useObserver, useObserverValue} from "react-hook-useobserver";
import React, {
    createContext,
    FC,
    MouseEvent as ReactMouseEvent,
    MutableRefObject,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef
} from "react";
import classes from "./Grid.module.css";
import {Observer} from "react-hook-useobserver/lib/useObserver";
import {IoArrowDown, IoArrowUp} from "react-icons/io5";
import {useObserverListener} from "react-hook-useobserver/lib";


interface GridProps {
    data: Array<any>,
    columns: Array<GridColumnGroup | GridColumn>,
    onFilterChange?: (filterValue: Map<string, any>) => void,
    defaultRowHeight?: number,
    defaultColWidth?: number,
    focusedDataItem?: any,
    onFocusedDataItemChange?: (newItem: any, oldItem: any) => void,
    pinnedLeftColumnIndex: number
}

export interface GridColumn extends Column {
    title: string,
    headerCellComponent?: React.FC<HeaderCellComponentProps>,
    filterCellComponent?: React.FC<HeaderCellComponentProps>
}

export interface GridColumnGroup {
    title: string,
    columns: Array<GridColumnGroup | GridColumn>
}

const FIRST_COLUMN_WIDTH = 20;
const HANDLER_LENGTH = 7;
const HEADER_HEIGHT = 50;
const DEFAULT_HEIGHT = 25;
const DEFAULT_WIDTH = 70;
//const SCROLLER_WIDTH = 17;
const SCROLLER_WIDTH = 0;

const CellComponentForColumnHeaderBase: FC<CellComponentProps> = (props) => {
    const index = props.colIndex;
    const handlerRef = useRef(defaultDif);
    const containerRef = useRef(defaultDif);
    const gridContextRef = useContext(GridContext);
    const column: any = props.column;
    const gridColumn: GridColumn = column;
    const CellComponentForColHeader = gridColumn.headerCellComponent || CellComponentForColumnHeader;
    const mousePositionRef = useRef({current: 0, next: 0, dragActive: false});
    const handleDrag = useCallback(dragListener(mousePositionRef, gridContextRef.current.onCellResize, index, containerRef, handlerRef, "horizontal"), []);
    useEffect(() => {
        handlerRef.current.style.left = `${containerRef.current.getBoundingClientRect().width - Math.ceil(0.5 * HANDLER_LENGTH)}px`;
    }, []);

    const title = props.dataItem[props.column.field];
    const shouldHaveResizeHandler = (props.rowIndex + (props?.rowSpan || 0)) === props.dataSource.length;
    return <Vertical ref={containerRef} style={{
        padding: '0px 0px',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        flexShrink: 0,
        flexGrow: 0,
        position: 'relative'
    }}>
        <CellComponentForColHeader column={gridColumn} colIndex={props.colIndex} rowIndex={props.rowIndex}
                                   field={gridColumn.field}
                                   title={title} dataSource={props.dataSource} rowSpan={props.rowSpan}
                                   colSpan={props.colSpan}/>
        {shouldHaveResizeHandler &&
        <Vertical ref={handlerRef} style={{
            height: '100%',
            position: 'absolute',
            backgroundColor: 'rgba(0,0,0,0.5)',
            width: HANDLER_LENGTH,
            zIndex: 1,
            top: 0,
            boxSizing: 'border-box',
            cursor: 'col-resize'
        }} onMouseDown={handleDrag} className={classes.handler}/>
        }
    </Vertical>;
};

const CellComponentToResizeRow: React.FC<CellComponentProps> = (props: CellComponentProps) => {
    const index = props.rowIndex;
    const containerRef = useRef(defaultDif);
    const handlerBottomRef = useRef(defaultDif);

    const gridContextRef = useContext(GridContext);
    const mousePositionRef = useRef({current: 0, next: 0, dragActive: false});
    const handleDrag = useCallback(dragListener(mousePositionRef, gridContextRef.current.onRowResize, index, containerRef, handlerBottomRef, "vertical"), []);
    useEffect(() => {
        handlerBottomRef.current.style.top = `${containerRef.current.getBoundingClientRect().height - Math.ceil(0.5 * HANDLER_LENGTH)}px`;
    }, []);
    return <Vertical ref={containerRef} style={{
        padding: '3px 5px',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        flexShrink: 0,
        flexGrow: 0,
        position: 'relative'
    }}>
        <Vertical ref={handlerBottomRef} style={{
            width: '100%',
            position: 'absolute',
            backgroundColor: 'rgba(0,0,0,0.5)',
            height: HANDLER_LENGTH,
            zIndex: 1,
            left: 0,
            boxSizing: 'border-box',
            cursor: 'pointer'
        }} onMouseDown={handleDrag} className={classes.handler}/>
    </Vertical>
};

function dragListener(mousePositionRef: React.MutableRefObject<{ current: number; next: number; dragActive: boolean }>, onResize: (colIndex: number, height: number) => void, index: number, containerRef: React.MutableRefObject<HTMLDivElement>, handlerRef: React.MutableRefObject<HTMLDivElement>, dragDirection: 'vertical' | 'horizontal' = 'vertical') {
    return (event: ReactMouseEvent<HTMLDivElement, MouseEvent>) => {

        event.preventDefault();
        const isVertical = dragDirection === 'vertical';
        if (isVertical) {
            mousePositionRef.current.current = event.clientY;
        } else {
            mousePositionRef.current.current = event.clientX;
        }

        mousePositionRef.current.dragActive = true;
        let cellHeight = 0;

        function closeDragElement() {
            mousePositionRef.current.dragActive = false;
            document.removeEventListener('mouseup', closeDragElement);
            document.removeEventListener('mousemove', onElementDrag);
            onResize(index, cellHeight + (Math.ceil(0.5 * HANDLER_LENGTH)));
        }

        function onElementDrag(event: MouseEvent) {
            event.preventDefault();
            if (!mousePositionRef.current.dragActive) {
                return;
            }

            if (isVertical && (event.clientY <= containerRef.current.getBoundingClientRect().y)) {
                return;
            }
            if ((!isVertical) && (event.clientX <= containerRef.current.getBoundingClientRect().x)) {
                return;
            }

            mousePositionRef.current.next = mousePositionRef.current.current - (isVertical ? event.clientY : event.clientX);
            mousePositionRef.current.current = isVertical ? event.clientY : event.clientX;
            cellHeight = ((isVertical ? handlerRef.current.offsetTop : handlerRef.current.offsetLeft) - mousePositionRef.current.next);
            if (isVertical) {
                handlerRef.current.style.top = cellHeight + 'px';
            } else {
                handlerRef.current.style.left = cellHeight + 'px';
            }

            onResize(index, cellHeight + (Math.ceil(0.5 * HANDLER_LENGTH)));
        }

        document.addEventListener('mouseup', closeDragElement);
        document.addEventListener('mousemove', onElementDrag);
    };
}


const defaultDif = document.createElement('div');

interface GridSortItem {
    field: string,
    direction: 'ASC' | 'DESC' | ''
}

interface GridContextType {
    onCellResize: (colIndex: number, width: number) => void,
    onRowResize: (colIndex: number, height: number) => void,
    setGridFilter: (value: (oldVal: Map<string, any>) => Map<string, any>) => void,
    $gridFilter?: Observer<Map<string, any>>,
    commitFilterChange: () => void,
    setGridSort?: (value: (oldVal: Array<GridSortItem>) => Array<GridSortItem>) => void,
    $gridSort?: Observer<Array<GridSortItem>>,
    props: GridProps,
    $focusedDataItem?: Observer<any>
}

function noOp() {
}

const GridContext = createContext<MutableRefObject<GridContextType>>({
    current: {
        onCellResize: noOp,
        onRowResize: noOp,
        setGridFilter: noOp,
        commitFilterChange: noOp,
        props: {data: [], columns: [], pinnedLeftColumnIndex: -1}
    }
});

const SORT_DIRECTION = {
    ASC: 'ASC',
    DESC: 'DESC'
};

function SortComponent({field}: { field: string }) {
    const gridContextRef = useContext(GridContext);
    const [$defaultSort] = useObserver([]);
    const direction = useObserverValue(gridContextRef.current.$gridSort || $defaultSort, (gridSort: Array<GridSortItem>) => {
        const sort = gridSort.find(sort => sort.field === field);
        return sort?.direction;
    });
    return <Vertical style={{flexShrink: 0, flexGrow: 0, marginLeft: 5}}>
        {direction === SORT_DIRECTION.ASC && <IoArrowUp/>}
        {direction === SORT_DIRECTION.DESC && <IoArrowDown/>}
    </Vertical>;
}

interface HeaderCellComponentProps {
    field: string,
    title: string,
    column: Column,
    colIndex: number,
    rowIndex: number,
    dataSource: Array<any>,
    rowSpan: number,
    colSpan: number
}

export function CellComponentForColumnHeader(props: HeaderCellComponentProps) {
    const column: any = props.column;
    const gridColumn: GridColumn = column;
    const FilterCellComponent: React.FC<HeaderCellComponentProps> = gridColumn.filterCellComponent || CellComponentForColumnHeaderFilter;
    const gridContextRef = useContext(GridContext);

    function handleSortClicked() {
        if (!gridContextRef.current.setGridSort) {
            return;
        }
        gridContextRef.current.setGridSort((oldVal: Array<GridSortItem>) => {
            // lets find old val index
            const oldField = oldVal.find(s => s.field === gridColumn.field);
            if (oldField) {

                const isAsc = oldField.direction === SORT_DIRECTION.ASC;
                if (isAsc) {
                    const newItem: GridSortItem = {field: gridColumn.field, direction: "DESC"};
                    return [...oldVal.filter(s => s.field !== gridColumn.field), newItem];
                } else {
                    return oldVal.filter(s => s.field !== gridColumn.field);
                }
            } else {
                return [...oldVal, {field: gridColumn.field, direction: 'ASC'}];
            }
        });
    }

    const shouldHaveFilter = (props.rowIndex + (props?.rowSpan || 0)) === props.dataSource.length;
    return <Vertical style={{height: '100%'}}>
        <Horizontal style={{flexGrow: 1, padding: '0px 5px', backgroundColor: '#eee', color: '#333'}} vAlign={'center'}
                    onClick={handleSortClicked}>
            <Vertical>
                {props.title}
            </Vertical>
            {shouldHaveFilter &&
            <SortComponent field={gridColumn.field}/>
            }
        </Horizontal>
        {shouldHaveFilter &&
        <FilterCellComponent title={props.title} field={props.field} colIndex={props.colIndex} column={gridColumn}
                             rowIndex={props.rowIndex} dataSource={props.dataSource} colSpan={props.colSpan}
                             rowSpan={props.colSpan}/>
        }
    </Vertical>;
}

function CellComponentForColumnHeaderFilter(props: HeaderCellComponentProps) {
    const gridContextRef = useContext(GridContext);
    const [$empty] = useObserver(new Map<string, any>());
    const value = useObserverValue(gridContextRef.current.$gridFilter || $empty, (arg: any) => {
        const value: Map<string, any> = arg;
        return value.get(props.field) || ''
    });
    return <Vertical style={{borderTop: '1px solid #ddd'}}>
        <input type="text" value={value} style={{border: 'none', borderRadius: 0, padding: '2px 5px'}}
               className={classes.filterInput} onChange={(event) => {
            gridContextRef.current.setGridFilter((oldVal: Map<string, any>) => {
                const newMap = new Map<string, any>(oldVal);
                newMap.set(props.field, event.target.value);
                return newMap;
            })
        }} onKeyUp={(event) => {
            if (event.code === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                gridContextRef.current.commitFilterChange();
            }
        }}/>
    </Vertical>
}

function compareValue(props: { prev: any, next: any, gridSort: Array<GridSortItem>, index: number, columns: Array<GridColumn>, dataSource: Array<any> }): number {
    const {prev, next, gridSort, index} = props;
    if (index >= gridSort.length) {
        return 0;
    }

    const {field, direction} = gridSort[index];
    const isAsc = direction === 'ASC';
    const isDesc = direction === 'DESC';
    const columns = props.columns;
    const colIndex = columns.findIndex(col => col.field === field);
    const column = columns[colIndex];
    const dataSource = props.dataSource;
    const dataItemToLabel = column.dataItemToValue || dataItemToValueDefaultImplementation;
    const prevValue = dataItemToLabel({
        dataItem: prev,
        column,
        colIndex,
        rowIndex: dataSource.indexOf(prev),
        dataSource
    });
    const nextValue = dataItemToLabel({
        dataItem: next,
        column,
        colIndex,
        rowIndex: dataSource.indexOf(next),
        dataSource
    });
    const prevLowerCase = prevValue.toLowerCase();
    const nextLowerCase = nextValue.toLowerCase();
    if (prevLowerCase === nextLowerCase) {
        return compareValue({prev, next, gridSort, index: index + 1, columns, dataSource});
    }
    const val = prevLowerCase > nextLowerCase ? 1 : -1;
    return isAsc ? val : isDesc ? -val : 0

}

function filterDataSource(dataSource: Array<any>, $gridFilter: Observer<Map<string, number>>, columns: Array<GridColumn>) {
    return dataSource.filter((data, rowIndex) => {
        return Array.from($gridFilter.current.keys()).reduce((accumulator: boolean, key: string) => {
            const gridFilter: Map<string, any> = $gridFilter.current;
            const colIndex = columns.findIndex(col => col.field === key);
            const column = columns[colIndex];
            const dataItemToValue = column?.dataItemToValue || dataItemToValueDefaultImplementation;
            const filterValue = gridFilter.get(key).toString().toUpperCase();
            const value = (dataItemToValue({
                dataItem: data,
                dataSource,
                column,
                colIndex,
                rowIndex
            }) || '').toUpperCase();
            return (value.indexOf(filterValue) >= 0) && accumulator;
        }, true);
    });
}

function convertColumnsPropsToColumns(columnsProp: Array<GridColumn | GridColumnGroup>): Array<GridColumn> {
    let columns: Array<GridColumn> = [];
    columnsProp.map((column: any) => {
        if ('columns' in column) {
            columns = columns.concat(convertColumnsPropsToColumns(column.columns));
        } else {
            columns.push(column);
        }
    });
    return columns;
}

function populateHeaderDataMap(columnsProp: Array<GridColumnGroup | GridColumn>, headerDataMap: Map<number, Map<string, string>>, rowIdx: number, setParentRowField?: (field: string) => void) {
    columnsProp.forEach((column) => {
        if (!headerDataMap.has(rowIdx)) {
            headerDataMap.set(rowIdx, new Map<string, string>());
        }
        const row: Map<string, string> = (headerDataMap.get(rowIdx) || new Map<string, string>());
        if ('columns' in column) {
            populateHeaderDataMap(column.columns, headerDataMap, rowIdx + 1, (field: string) => {
                if (setParentRowField) {
                    setParentRowField(field);
                }
                row.set(field, column.title);
            });
        } else {
            if (setParentRowField) {
                setParentRowField(column.field);
            }
            row.set(column.field, column.title);
        }
    })
}

function constructHeaderData(columnsProp: Array<GridColumnGroup | GridColumn>) {
    return () => {
        const headerData: Array<any> = [];
        const headerDataMap: Map<number, Map<string, string>> = new Map<number, Map<string, string>>();
        populateHeaderDataMap(columnsProp, headerDataMap, 0);
        headerDataMap.forEach((row, rowId) => {
            if (rowId > 0) {
                const prevRow = headerDataMap.get(rowId - 1) || new Map<string, string>();
                prevRow.forEach((val, key) => {
                    if (!row.has(key)) {
                        row.set(key, val);
                    }
                })
            }
        });

        headerDataMap.forEach((row) => {
            const data: any = {};
            row.forEach((value, field) => {
                data[field] = value;
            });
            headerData.push(data);
        });
        return headerData;
    };
}

export default function Grid(gridProps: GridProps) {
    const {data: dataProp, focusedDataItem, columns: columnsProp, onFilterChange, defaultRowHeight: _defaultRowHeight, defaultColWidth: _defaultCoWidth, pinnedLeftColumnIndex} = gridProps;
    const defaultRowHeight = _defaultRowHeight || DEFAULT_HEIGHT;
    const defaultColWidth = _defaultCoWidth || DEFAULT_WIDTH;
    const [$columns, setColumns] = useObserver(() => convertColumnsPropsToColumns(columnsProp));

    const [$data, setData] = useObserver(dataProp);
    const [$viewPortDimension, setViewPortDimension] = useObserver({width: 0, height: 0});
    const [$customColWidth, setCustomColWidth] = useObserver(new Map<number, number>());
    const [$customRowHeight, setCustomRowHeight] = useObserver(new Map<number, number>());
    const [$scrollLeft, setScrollLeft] = useObserver(0);
    const [$scrollTop, setScrollTop] = useObserver(0);
    const [$gridFilter, setGridFilter] = useObserver(new Map<string, any>());
    const [$gridSort, setGridSort] = useObserver<Array<GridSortItem>>([]);
    const [$focusedDataItem, setFocusedDataItem] = useObserver(focusedDataItem);
    const [$pinnedLeftColumnWidth, setPinnedLeftColumnWidth] = useObserver(0);
    const viewportRef = useRef(defaultDif);
    useEffect(() => setViewPortDimension(viewportRef.current.getBoundingClientRect()), []);
    useEffect(() => setFocusedDataItem(focusedDataItem), [focusedDataItem]);
    useObserverListener([$viewPortDimension, $columns], () => {
        if ($viewPortDimension.current.width > 0) {
            const columnsWidth = new Map<number, number>();
            const columnsWidthPercentage = new Map<number, number>();
            let totalColumnsWidth = 0;
            let totalPercentage = 0;
            const viewPortWidth = $viewPortDimension.current.width - SCROLLER_WIDTH;
            $columns.current.forEach((column, columnIndex) => {
                if (typeof column.width === 'number') {
                    totalColumnsWidth += column.width;
                    columnsWidth.set(columnIndex, column.width);
                }
                if (typeof column.width === 'string' && column.width.endsWith('%')) {
                    const widthInPercentage = parseInt(column.width.replace('%', ''));
                    columnsWidthPercentage.set(columnIndex, widthInPercentage);
                    totalPercentage += widthInPercentage;
                }
            });
            const remainingWidth = viewPortWidth - totalColumnsWidth;
            if (remainingWidth > 0) {
                columnsWidthPercentage.forEach((value, key) => {
                    const width = (value / totalPercentage) * remainingWidth;
                    columnsWidth.set(key, width);
                });
            } else {
                columnsWidthPercentage.forEach((value, key) => {
                    columnsWidth.set(key, defaultColWidth || 0);
                });
            }
            const sortedColumnsWidth = new Map<number, number>(Array.from(columnsWidth.entries()).sort((a, b) => (a[0] === b[0] ? 0 : a[0] > b[0] ? 1 : -1)));
            setCustomColWidth(sortedColumnsWidth);
        }
    });
    useObserverListener($customColWidth, () => {
        const pinnedLeftColWidth = Array.from($customColWidth.current.entries()).filter((value) => value[0] <= pinnedLeftColumnIndex).reduce((acc, val) => acc + val[1], 0);
        setPinnedLeftColumnWidth(pinnedLeftColWidth);
    });
    const headerData: Array<any> = useMemo(constructHeaderData(columnsProp), []);
    useEffect(() => setData(dataProp), [dataProp]);
    useEffect(() => setColumns(convertColumnsPropsToColumns(columnsProp)), [columnsProp]);
    const columnDataToResizeRow: Array<GridColumn> = useMemo(() => ([{
        field: '_',
        width: FIRST_COLUMN_WIDTH,
        title: ' ',
        cellComponent: CellComponentToResizeRow
    }]), []);

    const columnsHeaderColumn: Array<Column | GridColumn> = useObserverValue($columns, (columns: Array<GridColumn>) => {
        return columns.map<Column>((c: Column) => ({
            ...c,
            cellComponent: CellComponentForColumnHeaderBase,
            cellSpanFunction: props => {
                let rowSpan = 1;
                let colSpan = 1;

                function getCellTitle(rowIndex: number, colIndex: number) {
                    const rowData = props.data[rowIndex];
                    const column = props.columns[colIndex];
                    if (rowData && column) {
                        return rowData[column.field];
                    }
                    return '';
                }

                const cellTitle = getCellTitle(props.rowIndex, props.colIndex);
                while (rowSpan <= props.lastRowIndexInsideViewPort && cellTitle === getCellTitle(props.rowIndex + rowSpan, props.colIndex)) {
                    rowSpan++;
                }
                while (colSpan <= props.lastColIndexInsideViewPort && cellTitle === getCellTitle(props.rowIndex, props.colIndex + colSpan)) {
                    colSpan++;
                }
                return {
                    rowSpan,
                    colSpan
                }
            },
        }))
    });

    const gridContextRef = useRef({
        props: gridProps,
        columns: $columns.current,
        onCellResize: (index: number, width: number) => {
            setCustomColWidth(oldVal => {
                const newVal = new Map(oldVal);
                newVal.set(index, width);
                return newVal;
            });
        },
        onRowResize: (index: number, height: number) => {
            setCustomRowHeight(oldVal => {
                const newVal = new Map(oldVal);
                newVal.set(index, height);
                return newVal;
            });

        },
        $gridFilter, setGridFilter,
        $gridSort, setGridSort,
        $focusedDataItem,
        commitFilterChange: () => {
            if (onFilterChange) {
                onFilterChange($gridFilter.current)
            } else {
                const filteredData = filterDataSource(gridContextRef.current.props.data, $gridFilter, gridContextRef.current.columns);
                setData(filteredData);
            }
        }
    });
    gridContextRef.current.props = gridProps;
    const sheetDataToResizeRow = useMemo(() => dataProp.map(() => ({_: ''})), [dataProp]);
    useObserverListener([$gridSort, $columns], () => {
        const gridSort: Array<GridSortItem> = $gridSort.current;
        const clonedData = [...dataProp];
        clonedData.sort((prev: any, next: any) => compareValue({
            prev,
            next,
            gridSort,
            index: 0,
            columns: $columns.current,
            dataSource: dataProp
        }));
        setData(clonedData);
    });

    return <Vertical style={{height: '100%', width: '100%', overflow: 'auto'}}>
        <GridContext.Provider value={gridContextRef}>
            <Horizontal>
                <Vertical style={{
                    flexBasis: FIRST_COLUMN_WIDTH,
                    flexShrink: 0,
                    flexGrow: 0,
                    borderRight: '1px solid #ddd',
                    borderBottom: '1px solid #ddd'
                }}/>
                {/*HERE IS THE PLACE WHERE WE USE TO PLACE LEFT COLUMN PINNING*/}
                <Horizontal style={{height: '100%', flexGrow: 1, overflow: 'auto', position: 'relative'}}>
                    <ObserverValue observers={[$pinnedLeftColumnWidth]} render={() => {
                        return <Vertical style={{
                            width: $pinnedLeftColumnWidth.current,
                            overflow: 'auto',
                            flexShrink: 0,
                            flexGrow: 0,
                            position: 'absolute',
                            zIndex: 1,
                        }}>
                            <Sheet data={headerData}
                                   columns={columnsHeaderColumn.filter((value, index) => index <= pinnedLeftColumnIndex)}
                                   $customColWidth={$customColWidth}
                                   styleContainer={{width: '100%'}}
                                   showScroller={false}
                                   defaultRowHeight={HEADER_HEIGHT}
                                   defaultColWidth={defaultColWidth}
                                   hideLeftColumnIndex={-1}
                            />
                        </Vertical>
                    }}/>

                    {/*END OF THE PLACE WHERE WE USE TO PLACE LEFT COLUMN PINNING*/}
                    <Vertical style={{flexGrow: 1, overflow: 'auto'}}>
                        <Sheet data={headerData}
                               columns={columnsHeaderColumn}
                               $customColWidth={$customColWidth}
                               $scrollLeft={$scrollLeft}
                               showScroller={false}
                               defaultRowHeight={HEADER_HEIGHT}
                               defaultColWidth={defaultColWidth}
                               hideLeftColumnIndex={pinnedLeftColumnIndex}
                        />
                    </Vertical>
                </Horizontal>
            </Horizontal>
            <Horizontal style={{height: `calc(100% - ${HEADER_HEIGHT}px)`, width: '100%', overflow: 'auto'}}>
                <Vertical style={{flexBasis: FIRST_COLUMN_WIDTH, flexShrink: 0, flexGrow: 0}}>
                    <Sheet data={sheetDataToResizeRow}
                           columns={columnDataToResizeRow}
                           $customRowHeight={$customRowHeight}
                           $scrollTop={$scrollTop}
                           showScroller={false}
                           defaultColWidth={FIRST_COLUMN_WIDTH}
                           defaultRowHeight={defaultRowHeight}
                           hideLeftColumnIndex={-1}
                    />
                </Vertical>
                <Horizontal style={{height: '100%', flexGrow: 1, overflow: 'auto', position: 'relative'}}>

                    <ObserverValue observers={[$pinnedLeftColumnWidth, $data, $columns]} render={() => {
                        return <Vertical style={{
                            width: $pinnedLeftColumnWidth.current,
                            flexShrink: 0,
                            flexGrow: 0,
                            left: 0,
                            height: `calc(100% - ${SCROLLER_WIDTH}px)`,
                            position: 'absolute',
                            zIndex: 1
                        }}>
                            <Sheet data={$data.current}
                                   columns={$columns.current.filter((value, index) => index <= pinnedLeftColumnIndex)}
                                   $customRowHeight={$customRowHeight}
                                   $customColWidth={$customColWidth}
                                   showScroller={false}
                                   $scrollTop={$scrollTop}
                                   defaultColWidth={defaultColWidth}
                                   styleContainer={{width: '100%'}}
                                   defaultRowHeight={defaultRowHeight}
                                   onCellClicked={event => {
                                       if (gridProps.onFocusedDataItemChange) {
                                           gridProps.onFocusedDataItemChange(event.dataItem, $focusedDataItem.current);
                                       } else {
                                           setFocusedDataItem(event.dataItem);
                                       }
                                   }}
                                   hideLeftColumnIndex={-1}
                                   $focusedDataItem={$focusedDataItem}

                            />
                        </Vertical>
                    }}/>
                    {/*END OF THE PLACE WHERE WE USE TO PLACE LEFT COLUMN PINNING*/}
                    <Vertical ref={viewportRef} style={{height: '100%', flexGrow: 1, overflow: 'auto'}}>
                        <ObserverValue observers={[$data, $columns]} render={() => {
                            return <Sheet data={$data.current}
                                          columns={$columns.current}
                                          $customRowHeight={$customRowHeight}
                                          $customColWidth={$customColWidth}
                                          onScroll={({scrollLeft, scrollTop}) => {
                                              setScrollLeft(scrollLeft);
                                              setScrollTop(scrollTop);
                                          }}
                                          defaultColWidth={defaultColWidth}
                                          defaultRowHeight={defaultRowHeight}
                                          onCellClicked={event => {
                                              if (gridProps.onFocusedDataItemChange) {
                                                  gridProps.onFocusedDataItemChange(event.dataItem, $focusedDataItem.current);
                                              } else {
                                                  setFocusedDataItem(event.dataItem);
                                              }
                                          }}
                                          $focusedDataItem={$focusedDataItem}
                                          hideLeftColumnIndex={pinnedLeftColumnIndex}

                            />
                        }}/>
                    </Vertical>
                </Horizontal>

            </Horizontal>
        </GridContext.Provider>
    </Vertical>
}

