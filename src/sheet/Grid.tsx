import {Horizontal, Vertical} from "react-hook-components";
import Sheet, {
    CellComponentProps,
    Column,
    dataItemToValueDefaultImplementation,
    HeaderCellComponentProps
} from "./Sheet";
import {ObserverValue, useObserver, useObserverValue} from "react-hook-useobserver";
import React, {
    createContext,
    FC,
    MouseEvent as ReactMouseEvent,
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
    columns: Array<GridColumn>,
    onFilterChange?: (filterValue: any) => void,
    defaultRowHeight? : number,
    defaultColWidth? : number
}

export interface GridColumn extends Column {
    title: string,
    headerCellComponent?: React.FC<HeaderCellComponentProps>,
    filterCellComponent?: React.FC<HeaderCellComponentProps>
}

const FIRST_COLUMN_WIDTH = 20;
const HANDLER_LENGTH = 7;
const HEADER_HEIGHT = 50;

const CellComponentForColumnHeaderBase: FC<CellComponentProps> = (props) => {
    const index = props.colIndex;
    const handlerRef = useRef(defaultDif);
    const containerRef = useRef(defaultDif);
    const {onCellResize} = useContext(GridContext);
    const column: any = props.column;
    const gridColumn: GridColumn = column;
    const CellComponentForColHeader = gridColumn.headerCellComponent || CellComponentForColumnHeader;
    const mousePositionRef = useRef({current: 0, next: 0, dragActive: false});
    const handleDrag = useCallback(dragListener(mousePositionRef, onCellResize, index, containerRef, handlerRef, "horizontal"), []);
    useEffect(() => {
        handlerRef.current.style.left = `${containerRef.current.getBoundingClientRect().width - Math.ceil(0.5 * HANDLER_LENGTH)}px`;
    }, []);
    return <Vertical ref={containerRef} style={{
        padding: '0px 0px',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        flexShrink: 0,
        flexGrow: 0,
        position: 'relative'
    }}>
        <CellComponentForColHeader column={gridColumn} colIndex={props.colIndex} field={gridColumn.field}
                                   title={gridColumn.title}/>
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
    </Vertical>;
};

const CellComponentToResizeRow: React.FC<CellComponentProps> = (props: CellComponentProps) => {
    const index = props.rowIndex;
    const containerRef = useRef(defaultDif);
    const handlerBottomRef = useRef(defaultDif);

    const {onRowResize} = useContext(GridContext);
    const mousePositionRef = useRef({current: 0, next: 0, dragActive: false});
    const handleDrag = useCallback(dragListener(mousePositionRef, onRowResize, index, containerRef, handlerBottomRef, "vertical"), []);
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

interface GridContextProps {
    onCellResize: (colIndex: number, width: number) => void,
    onRowResize: (colIndex: number, height: number) => void,
    setGridFilter: (value: any) => any,
    $gridFilter?: Observer<any>,
    onFilterChange: () => void,
    setGridSort?: (value: (oldVal: Array<GridSortItem>) => Array<GridSortItem>) => void,
    $gridSort?: Observer<Array<GridSortItem>>
}

function noOp() {
}

const GridContext = createContext<GridContextProps>({
    onCellResize: noOp,
    onRowResize: noOp,
    setGridFilter: noOp,
    onFilterChange: noOp,
});

const SORT_DIRECTION = {
    ASC: 'ASC',
    DESC: 'DESC'
};

function SortComponent({field}: { field: string }) {
    const {$gridSort} = useContext(GridContext);
    const [$defaultSort] = useObserver([]);
    const direction = useObserverValue($gridSort || $defaultSort, (gridSort: Array<GridSortItem>) => {
        const sort = gridSort.find(sort => sort.field === field);
        return sort?.direction;
    });
    return <Vertical style={{flexShrink: 0, flexGrow: 0, marginLeft: 5}}>
        {direction === SORT_DIRECTION.ASC && <IoArrowUp/>}
        {direction === SORT_DIRECTION.DESC && <IoArrowDown/>}
    </Vertical>;
}

export function CellComponentForColumnHeader(props: HeaderCellComponentProps) {
    const column: any = props.column;
    const gridColumn: GridColumn = column;
    const FilterCellComponent: React.FC<HeaderCellComponentProps> = gridColumn.filterCellComponent || CellComponentForColumnHeaderFilter;
    const {setGridSort} = useContext(GridContext);

    function handleSortClicked() {
        if (!setGridSort) {
            return;
        }
        setGridSort((oldVal: Array<GridSortItem>) => {
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

    return <Vertical style={{height: '100%'}}>
        <Horizontal style={{flexGrow: 1, padding: '0px 5px', backgroundColor: '#eee', color: '#333'}} vAlign={'center'}
                    onClick={handleSortClicked}>
            <Vertical>
                {props.title}
            </Vertical>
            <SortComponent field={gridColumn.field}/>
        </Horizontal>
        <FilterCellComponent title={props.title} field={props.field} colIndex={props.colIndex} column={gridColumn}/>
    </Vertical>;
}

function CellComponentForColumnHeaderFilter(props: HeaderCellComponentProps) {
    const {$gridFilter, setGridFilter, onFilterChange} = useContext(GridContext);
    const [$empty] = useObserver({});
    const value = useObserverValue($gridFilter || $empty, (value: any) => value[props.field] || '');
    return <Vertical style={{borderTop: '1px solid #ddd'}}>
        <input type="text" value={value} style={{border: 'none', borderRadius: 0, padding: '2px 5px'}}
               className={classes.filterInput} onChange={(event) => {
            setGridFilter((oldVal: any) => {
                return {...oldVal, [props.field]: event.target.value}
            })
        }} onKeyUp={(event) => {

            if (event.code === 'Enter') {

                event.preventDefault();
                event.stopPropagation();
                onFilterChange();

            }
        }}/>
    </Vertical>
}

function compareValue(props:{prev: any, next: any,gridSort:Array<GridSortItem>,index:number,columns:Array<GridColumn>,dataSource:Array<any>}):number {
    const {prev, next,gridSort,index} = props;
    if(index >= gridSort.length){
        return 0;
    }

    const {field,direction} = gridSort[index];
    const isAsc = direction === 'ASC';
    const isDesc = direction === 'DESC';
    const columns = props.columns;
    const colIndex = columns.findIndex(col => col.field === field);
    const column = columns[colIndex];
    const dataSource = props.dataSource;
    const dataItemToLabel = column.dataItemToValue || dataItemToValueDefaultImplementation;
    const prevValue = dataItemToLabel({dataItem:prev,column,colIndex,rowIndex:dataSource.indexOf(prev),dataSource});
    const nextValue = dataItemToLabel({dataItem:next,column,colIndex,rowIndex:dataSource.indexOf(next),dataSource});
    if (typeof prevValue === 'string' && typeof nextValue === 'string') {
        const prevLowerCase = prevValue.toLowerCase();
        const nextLowerCase = nextValue.toLowerCase();
        if(prevLowerCase === nextLowerCase){
            return compareValue({prev,next,gridSort,index:index+1,columns,dataSource});
        }
        const val = prevLowerCase > nextLowerCase ? 1 : -1;
        return isAsc ? val : isDesc ? -val : 0
    }
    if (typeof prevValue === 'number' && typeof nextValue === 'number') {
        if(prevValue === nextValue){
            return compareValue({prev,next,gridSort,index:index+1,columns,dataSource});
        }
        const val = prevValue - nextValue;
        return isAsc ? val : isDesc ? -val : 0;
    }
    if (prevValue instanceof Date && nextValue instanceof Date) {
        const prevValueTime = prevValue.getTime();
        const nextValueTime = nextValue.getTime();
        if(prevValue === nextValue){
            return compareValue({prev,next,gridSort,index:index+1,columns,dataSource});
        }
        const val = prevValueTime - nextValueTime;
        return isAsc ? val : isDesc ? -val : 0;

    }
    if (typeof prevValue === 'boolean' && typeof nextValue === 'boolean') {
        if(prevValue === nextValue){
            return compareValue({prev,next,gridSort,index:index+1,columns,dataSource});
        }
        const val = prevValue ? 1 : -1;
        return isAsc ? val : isDesc ? -val : 0;
    }
    return 0;
}

export default function Grid({data: dataSource, columns, onFilterChange,defaultRowHeight,defaultColWidth}: GridProps) {
    const [$data, setData] = useObserver(dataSource);
    const [$customColWidth, setCustomColWidth] = useObserver(new Map<number, number>(columns.map((col, index) => [index, col.width])));
    const [$customRowHeight, setCustomRowHeight] = useObserver(new Map<number, number>());
    const [$scrollLeft, setScrollLeft] = useObserver(0);
    const [$scrollTop, setScrollTop] = useObserver(0);
    const [$gridFilter, setGridFilter] = useObserver({});
    const [$gridSort, setGridSort] = useObserver<Array<GridSortItem>>([]);
    const headerData = [columns.reduce((acc: any, column: GridColumn) => {
        acc[column.field] = column.title;
        return acc;
    }, {})];
    useEffect(() => {
        setData(dataSource);
    },[dataSource]);
    const columnDataToResizeRow: GridColumn = {
        field: '_',
        width: FIRST_COLUMN_WIDTH,
        title: ' ',
        cellComponent: CellComponentToResizeRow
    };
    const sheetDataToResizeRow = useMemo(() => dataSource.map(() => ({_: ''})), [dataSource]);
    useObserverListener($gridSort, () => {
        const gridSort: Array<GridSortItem> = $gridSort.current;
        const clonedData = [...dataSource];
        clonedData.sort((prev:any,next:any) => compareValue({prev,next,gridSort,index:0,columns,dataSource}))
        setData(clonedData);
    });

    return <Vertical style={{height: '100%', width: '100%'}}>
        <GridContext.Provider value={{
            onCellResize: (index, width) => {
                setCustomColWidth(oldVal => {
                    const newVal = new Map(oldVal);
                    newVal.set(index, width);
                    return newVal;
                });
            },
            onRowResize: (index, height) => {
                setCustomRowHeight(oldVal => {
                    const newVal = new Map(oldVal);
                    newVal.set(index, height);
                    return newVal;
                });
            },
            $gridFilter, setGridFilter,
            $gridSort, setGridSort,
            onFilterChange: () => {
                // we need to inform the outside that filter has changed !
                // if user has implement onFilterChange, then the filter will be their responsibility,
                // however if the user does not implement onFilterChange, then it will be grid responsibility
                // to perform local filtering

                if (onFilterChange) {
                    onFilterChange($gridFilter.current)
                } else {
                    // this is our logic to perform filtering
                    const filteredData = dataSource.filter((data,rowIndex) => {
                        return Object.keys($gridFilter.current).reduce((accumulator: boolean, key: string) => {
                            const gridFilter: any = $gridFilter.current;
                            const colIndex = columns.findIndex(col => col.field === key);
                            const column = columns[colIndex];
                            const dataItemToValue = column?.dataItemToValue || dataItemToValueDefaultImplementation;
                            const filterValue = gridFilter[key].toString().toUpperCase();
                            const value = (dataItemToValue({dataItem:data,dataSource,column,colIndex,rowIndex}) || '').toUpperCase();
                            return (value.indexOf(filterValue) >= 0) && accumulator;
                        }, true);
                    });

                    setData(filteredData);
                }
            }
        }}>
            <Horizontal>
                <Vertical style={{
                    flexBasis: FIRST_COLUMN_WIDTH,
                    flexShrink: 0,
                    flexGrow: 0,
                    borderRight: '1px solid #ddd',
                    borderBottom: '1px solid #ddd'
                }}/>
                <Vertical style={{width: `calc(100% - ${FIRST_COLUMN_WIDTH}px)`}}>

                    <Sheet data={headerData}
                           columns={columns.map<Column>((c: Column) => ({
                               ...c,
                               cellComponent: CellComponentForColumnHeaderBase
                           }))}
                           $customColWidth={$customColWidth}
                           $scrollLeft={$scrollLeft}
                           showScroller={false}
                           defaultRowHeight={HEADER_HEIGHT}
                           defaultColWidth={defaultColWidth}
                    />

                </Vertical>
            </Horizontal>
            <Horizontal style={{height: `calc(100% - ${HEADER_HEIGHT}px)`, width: '100%'}}>
                <Vertical style={{flexBasis: FIRST_COLUMN_WIDTH, flexShrink: 0, flexGrow: 0}}>
                    <Sheet data={sheetDataToResizeRow}
                           columns={[columnDataToResizeRow]}
                           $customRowHeight={$customRowHeight}
                           $scrollTop={$scrollTop}
                           showScroller={false}
                           defaultColWidth={FIRST_COLUMN_WIDTH}
                           defaultRowHeight={defaultRowHeight}
                    />
                </Vertical>
                <Vertical style={{height: '100%', width: `calc(100% - ${FIRST_COLUMN_WIDTH}px)`}}>
                    <ObserverValue observers={$data} render={() => {

                        return <Sheet data={$data.current} columns={columns}
                                      $customRowHeight={$customRowHeight}
                                      $customColWidth={$customColWidth}

                                      onScroll={({scrollLeft, scrollTop}) => {
                                          setScrollLeft(scrollLeft);
                                          setScrollTop(scrollTop);
                                      }}
                                      defaultColWidth={defaultColWidth}
                                      defaultRowHeight={defaultRowHeight}
                        />
                    }}/>
                </Vertical>
            </Horizontal>
        </GridContext.Provider>
    </Vertical>
}