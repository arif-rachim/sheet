import {Horizontal, Vertical} from "react-hook-components";
import Sheet, {CellComponentProps, Column, HeaderCellComponentProps} from "./Sheet";
import {ObserverValue, useObserver, useObserverValue} from "react-hook-useobserver";
import React, {
    createContext,
    FC,
    MouseEvent as ReactMouseEvent,
    useCallback,
    useContext,
    useEffect, useMemo,
    useRef
} from "react";
import classes from "./Grid.module.css";
import {Observer} from "react-hook-useobserver/lib/useObserver";

interface GridProps {
    data: Array<any>,
    columns: Array<GridColumn>,
    onFilterChange?: (filterValue: any) => void
}

export interface GridColumn extends Column {
    title: string,
    headerCellComponent?: React.FC<HeaderCellComponentProps>,
    filterCellComponent?: React.FC<HeaderCellComponentProps>
}

const FIRST_COLUMN_WIDTH = 10;
const HANDLER_LENGTH = 7;


const CellComponentForHeader: FC<CellComponentProps> = (props) => {
    const index = props.colIndex;
    const mousePositionRef = useRef({currentX: 0, nextX: 0, dragActive: false});
    const handlerRightRef = useRef(defaultDif);
    const containerRef = useRef(defaultDif);
    const {onCellResize} = useContext(GridContext);
    const column: any = props.column;
    const gridColumn: GridColumn = column;

    const HeaderCellComponent = gridColumn.headerCellComponent || DefaultHeaderCellComponent;
    const handleDrag = useCallback((event: ReactMouseEvent<HTMLDivElement, MouseEvent>) => {
        event.preventDefault();
        mousePositionRef.current.currentX = event.clientX;
        mousePositionRef.current.dragActive = true;
        let cellWidth = 0;

        function closeDragElement() {
            mousePositionRef.current.dragActive = false;
            document.removeEventListener('mouseup', closeDragElement);
            document.removeEventListener('mousemove', onElementDrag);
            onCellResize(index, cellWidth + (Math.ceil(0.5 * HANDLER_LENGTH)));
        }

        function onElementDrag(event: MouseEvent) {
            event.preventDefault();
            if (!mousePositionRef.current.dragActive) {
                return;
            }

            if (event.clientX <= containerRef.current.getBoundingClientRect().x) {
                return;
            }
            mousePositionRef.current.nextX = mousePositionRef.current.currentX - event.clientX;
            mousePositionRef.current.currentX = event.clientX;
            cellWidth = (handlerRightRef.current.offsetLeft - mousePositionRef.current.nextX);
            handlerRightRef.current.style.left = cellWidth + 'px';

        }

        document.addEventListener('mouseup', closeDragElement);
        document.addEventListener('mousemove', onElementDrag);

    }, []);
    useEffect(() => {
        handlerRightRef.current.style.left = `${containerRef.current.getBoundingClientRect().width - Math.ceil(0.5 * HANDLER_LENGTH)}px`;
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
        <HeaderCellComponent column={gridColumn} colIndex={props.colIndex} field={gridColumn.field}
                             title={gridColumn.title}/>
        <Vertical ref={handlerRightRef} style={{
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
}

const RowCellResizer: React.FC<CellComponentProps> = (props: CellComponentProps) => {
    const index = props.rowIndex;
    const containerRef = useRef(defaultDif);
    const handlerBottomRef = useRef(defaultDif);
    const mousePositionRef = useRef({currentY: 0, nextY: 0, dragActive: false});
    const {onRowResize} = useContext(GridContext);
    const handleDrag = useCallback((event: ReactMouseEvent<HTMLDivElement, MouseEvent>) => {
        event.preventDefault();
        mousePositionRef.current.currentY = event.clientY;
        mousePositionRef.current.dragActive = true;
        let cellHeight = 0;

        function closeDragElement() {
            mousePositionRef.current.dragActive = false;
            document.removeEventListener('mouseup', closeDragElement);
            document.removeEventListener('mousemove', onElementDrag);
            onRowResize(index, cellHeight + (Math.ceil(0.5 * HANDLER_LENGTH)));
        }

        function onElementDrag(event: MouseEvent) {
            event.preventDefault();
            if (!mousePositionRef.current.dragActive) {
                return;
            }

            if (event.clientY <= containerRef.current.getBoundingClientRect().y) {
                return;
            }
            mousePositionRef.current.nextY = mousePositionRef.current.currentY - event.clientY;
            mousePositionRef.current.currentY = event.clientY;
            cellHeight = (handlerBottomRef.current.offsetTop - mousePositionRef.current.nextY);
            handlerBottomRef.current.style.top = cellHeight + 'px';

        }

        document.addEventListener('mouseup', closeDragElement);
        document.addEventListener('mousemove', onElementDrag);

    }, []);
    useEffect(() => {
        handlerBottomRef.current.style.top = `${containerRef.current.getBoundingClientRect().height - Math.ceil(0.5 * HANDLER_LENGTH)}px`;
    }, []);
    return <Vertical ref={containerRef} style={{
        padding: '3px 5px',
        borderRight: '1px solid #CCC',
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
            cursor: 'col-resize'
        }} onMouseDown={handleDrag}/>
    </Vertical>
}

const defaultDif = document.createElement('div');

interface GridContextProps {
    onCellResize: (colIndex: number, width: number) => void,
    onRowResize: (colIndex: number, height: number) => void,
    setGridFilter: (value: any) => any,
    $gridFilter?: Observer<any>,
    onFilterChange: () => void
}

function noOp() {
}

const GridContext = createContext<GridContextProps>({
    onCellResize: noOp,
    onRowResize: noOp,
    setGridFilter: noOp,
    onFilterChange: noOp
})

export function DefaultHeaderCellComponent(props: HeaderCellComponentProps) {
    const column: any = props.column;
    const gridColumn: GridColumn = column;
    const FilterCellComponent: React.FC<HeaderCellComponentProps> = gridColumn.filterCellComponent || DefaultFilterCellComponent;
    return <Vertical style={{height: '100%'}}>
        <Vertical style={{flexGrow: 1, padding: '0px 5px'}} vAlign={'center'}>{props.title}</Vertical>
        <FilterCellComponent title={props.title} field={props.field} colIndex={props.colIndex} column={gridColumn}/>
    </Vertical>;
}

function DefaultFilterCellComponent(props: HeaderCellComponentProps) {
    const {$gridFilter, setGridFilter, onFilterChange} = useContext(GridContext);
    const [$empty] = useObserver({});
    const value = useObserverValue($gridFilter || $empty, (value: any) => value[props.field] || '');
    return <Vertical>
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

export default function Grid({data:dataSource, columns, onFilterChange}: GridProps) {
    const [$data,setData] = useObserver(dataSource);
    const [$customColWidth, setCustomColWidth] = useObserver(new Map<number, number>(columns.map((col, index) => [index, col.width])));
    const [$customRowHeight, setCustomRowHeight] = useObserver(new Map<number, number>());
    const [$scrollLeft, setScrollLeft] = useObserver(0);
    const [$scrollTop, setScrollTop] = useObserver(0);
    const [$gridFilter, setGridFilter] = useObserver({});
    const headerData = [columns.reduce((acc: any, column: GridColumn, index: number) => {
        acc[column.field] = column.title;
        return acc;
    }, {})];
    const firstColData: GridColumn = {
        field: '_',
        width: FIRST_COLUMN_WIDTH,
        title: ' ',
        cellComponent: RowCellResizer,
        headerCellComponent: DefaultHeaderCellComponent
    };
    const dataForColumnResizer = useMemo(() => dataSource.map((d, index) => ({_: ''})),[]);
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
            setGridFilter,
            $gridFilter,
            onFilterChange: () => {
                // we need to inform the outside that filter has changed !
                // if user has implement onFilterChange, then the filter will be their responsibility,
                // however if the user does not implement onFilterChange, then it will be grid responsibility
                // to perform local filtering

                if (onFilterChange){
                    onFilterChange($gridFilter.current)
                }else{
                    // this is our logic to perform filtering
                    const filteredData = dataSource.filter(data => {
                        return Object.keys($gridFilter.current).reduce((accumulator:boolean,key:string) => {
                            const gridFilter:any = $gridFilter.current;
                            const value = gridFilter[key].toString().toUpperCase();
                            return (data[key].toString().toUpperCase().indexOf(value) >= 0) && accumulator;
                        },true);
                    })

                    setData(filteredData);
                }
            }
        }}>
            <Horizontal>
                <Vertical style={{flexBasis: FIRST_COLUMN_WIDTH, flexShrink: 0, flexGrow: 0}}/>
                <Vertical style={{width: `calc(100% - ${FIRST_COLUMN_WIDTH}px)`}}>

                    <Sheet data={headerData}
                           columns={columns.map<Column>((c: Column, index: number) => ({
                               ...c,
                               cellComponent: CellComponentForHeader
                           }))}
                           $customColWidth={$customColWidth}
                           $scrollLeft={$scrollLeft}
                           showScroller={false}
                           defaultRowHeight={50}
                    />

                </Vertical>
            </Horizontal>
            <Horizontal style={{height: 'calc(100% - 25px)', width: '100%'}}>
                <Vertical style={{flexBasis: FIRST_COLUMN_WIDTH, flexShrink: 0, flexGrow: 0}}>
                    <Sheet data={dataForColumnResizer}
                           columns={[firstColData]}
                           $customRowHeight={$customRowHeight}
                           $scrollTop={$scrollTop}
                           showScroller={false}
                           defaultColWidth={FIRST_COLUMN_WIDTH}
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
                        />
                    }}/>
                </Vertical>
            </Horizontal>
        </GridContext.Provider>
    </Vertical>
}