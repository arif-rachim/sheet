import {Horizontal, Vertical} from "react-hook-components";
import Sheet, {CellComponentProps, Column, HeaderCellComponentProps} from "./Sheet";
import {ObserverValue, useObserver} from "react-hook-useobserver";
import {createContext, FC, MouseEvent as ReactMouseEvent, useCallback, useContext, useEffect, useRef} from "react";

interface GridProps {
    data: Array<any>,
    columns: Array<Column>
}

const FIRST_COLUMN_WIDTH = 10;

const HANDLER_WIDTH = 7;

const CellComponentForHeader: FC<CellComponentProps> = (props) => {
    const index = props.colIndex;
    const mousePositionRef = useRef({currentX: 0, nextX: 0, dragActive: false});
    const handlerRightRef = useRef(defaultDif);
    const containerRef = useRef(defaultDif);
    const {onCellResize} = useContext(GridContext);
    const HeaderCellComponent = props.column.headerCellComponent || DefaultHeaderCellComponent;
    const handleDrag = useCallback((event: ReactMouseEvent<HTMLDivElement, MouseEvent>) => {
        event.preventDefault();
        mousePositionRef.current.currentX = event.clientX;
        mousePositionRef.current.dragActive = true;
        let cellWidth = 0;

        function closeDragElement() {
            mousePositionRef.current.dragActive = false;
            document.removeEventListener('mouseup', closeDragElement);
            document.removeEventListener('mousemove', onElementDrag);
            onCellResize(index,cellWidth + (Math.ceil(0.5 * HANDLER_WIDTH)));
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
        handlerRightRef.current.style.left = `${containerRef.current.getBoundingClientRect().width - Math.ceil(0.5 * HANDLER_WIDTH)}px`;
    },[]);
    return <Vertical ref={containerRef} style={{
        padding: '3px 5px',
        borderRight: '1px solid #CCC',
        width: '100%',
        height:'100%',
        boxSizing:'border-box',
        flexShrink: 0,
        flexGrow: 0,
        position: 'relative'
    }}>
        <HeaderCellComponent column={props.column} colIndex={props.colIndex} field={props.column.field} title={props.column.title}/>
        <Vertical ref={handlerRightRef} style={{
            height: '100%',
            position: 'absolute',
            backgroundColor: 'rgba(0,0,0,0.5)',
            width: HANDLER_WIDTH,
            zIndex: 1,
            top: 0,
            boxSizing: 'border-box',
            cursor: 'col-resize'
        }} onMouseDown={handleDrag}/>
    </Vertical>;
}

const RowCellResizer:React.FC<CellComponentProps> = (props:CellComponentProps) => {
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
            onRowResize(index,cellHeight + (Math.ceil(0.5 * HANDLER_WIDTH)));
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
        handlerBottomRef.current.style.top = `${containerRef.current.getBoundingClientRect().height - Math.ceil(0.5 * HANDLER_WIDTH)}px`;
    },[]);
    return <Vertical ref={containerRef}  style={{
        padding: '3px 5px',
        borderRight: '1px solid #CCC',
        width: '100%',
        height:'100%',
        boxSizing:'border-box',
        flexShrink: 0,
        flexGrow: 0,
        position: 'relative'
    }}>
        <Vertical ref={handlerBottomRef} style={{
            width: '100%',
            position: 'absolute',
            backgroundColor: 'rgba(0,0,0,0.5)',
            height: HANDLER_WIDTH,
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
    onRowResize: (colIndex: number, height: number) => void
}

function noOp() {
}

const GridContext = createContext<GridContextProps>({
    onCellResize: noOp,
    onRowResize:noOp
})

export function DefaultHeaderCellComponent(props:HeaderCellComponentProps) {
    return <Vertical>{props.title}</Vertical>;
}

export default function Grid({data, columns}: GridProps) {

    const [$customColWidth, setCustomColWidth] = useObserver(new Map<number, number>(columns.map((col, index) => [index, col.width])));
    const [$customRowHeight, setCustomRowHeight] = useObserver(new Map<number, number>());
    const [$scrollLeft,setScrollLeft] = useObserver(0);
    const [$scrollTop,setScrollTop] = useObserver(0);
    const headerData = [columns.reduce((acc: any, column: Column, index: number) => {
        acc[column.field] = column.title;
        return acc;
    }, {})];
    return <Vertical style={{height: '100%', width: '100%'}}>
        {/* we need to convert the columns into one row of data*/}
        <GridContext.Provider value={{
            onCellResize: (index, width) => {
                setCustomColWidth(oldVal => {
                    const newVal = new Map(oldVal);
                    newVal.set(index, width);
                    return newVal;
                });
            },
            onRowResize:(index, height) => {
                setCustomRowHeight(oldVal => {
                    const newVal = new Map(oldVal);
                    newVal.set(index, height);
                    return newVal;
                });
            }
        }}>
        <Horizontal >
            <Vertical style={{flexBasis: FIRST_COLUMN_WIDTH, flexShrink: 0, flexGrow: 0}}/>
            <Vertical style={{width: `calc(100% - ${FIRST_COLUMN_WIDTH}px)`}}>

                    <Sheet data={headerData}
                           columns={columns.map<Column>((c: Column, index: number) => ({...c,cellComponent: CellComponentForHeader}))}
                           $customColWidth={$customColWidth}
                           $scrollLeft={$scrollLeft}
                           showScroller={false}
                    />

            </Vertical>
        </Horizontal>
        <Horizontal style={{height: 'calc(100% - 25px)', width: '100%'}}>
            <Vertical style={{flexBasis: FIRST_COLUMN_WIDTH, flexShrink: 0, flexGrow: 0}}>
                <Sheet data={data.map((d,index)=>({_:''}))}
                       columns={[{
                           field : '_',
                           width : FIRST_COLUMN_WIDTH,
                           title:' ',
                           cellComponent : RowCellResizer,
                           headerCellComponent : DefaultHeaderCellComponent
                       }]}
                       $customRowHeight={$customRowHeight}
                       $scrollTop={$scrollTop}
                       showScroller={false}
                       defaultColWidth={FIRST_COLUMN_WIDTH}
                />
            </Vertical>
            <Vertical style={{height: '100%', width: `calc(100% - ${FIRST_COLUMN_WIDTH}px)`}}>
                <ObserverValue observers={$customColWidth} render={() => {
                    return <Sheet data={data} columns={columns}
                                  $customRowHeight={$customRowHeight}
                                  $customColWidth={$customColWidth}
                                  onScroll={({scrollLeft,scrollTop}) => {
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