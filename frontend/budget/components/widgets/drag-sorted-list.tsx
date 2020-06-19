import * as React from 'react';

/**
 * Any child of a DragSortedList should support these properties.
 */
export interface DragSortedListChildProps {
    draggable?: React.HTMLAttributes<HTMLElement>;
    draggableClass?: string[];
    dragHandleFor?: (child: React.Component) => React.HTMLAttributes<HTMLElement>;
}

interface Props {
    dragSortEnabled?: boolean;
    wrapperElementType?: string;
    wrapperElementProps?: object;
    placeholder?: React.ReactElement<any>;
    onChangeItemPosition?: (childProps: any, newIndex: number) => void;
}
interface State {
    /** Have we receieved a dragStart event? */
    dragStarted: boolean;
    /** Is the user initiating this drag via the designated drag handle? */
    handleInUse: boolean;
    /** Have we received a dragStart _and_ a dragOver event? */
    isDragging: boolean;
    oldIndex: number;
    newIndex: number;
}

/**
 * Widget for any sequence of element that should be drag-sortable
 *
 * Each child must:
 * - apply {...this.props.draggable} to its root HTML element
 * - apply {...this.props.dragHandleFor(this)} to the element that should act as a drag handle (which may be its root element)
 */
export class DragSortedList extends React.PureComponent<Props, State> {

    public static defaultProps: Partial<Props> = {
        dragSortEnabled: true,
        wrapperElementType: 'ul',
        wrapperElementProps: {},
        placeholder: <li className="drag-sort-placeholder" />,
        onChangeItemPosition: (childProps: any, newIndex: number) => {},
    };

    constructor(props: Props) {
        super(props);
        // State:
        this.state = {
            dragStarted: false,
            handleInUse: false,
            isDragging: false,
            oldIndex: 0,
            newIndex: 0,
        };
    }

    private handleDragStart(childIndex: number, event: React.DragEvent<HTMLElement>) {
        if (!this.props.dragSortEnabled || !this.state.handleInUse) {
            event.preventDefault();
            return;
        }
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData("text/html", null); // Required for Firefox
        // Note that we don't set 'isDragging' to true until the first dragOver event,
        // because hiding the dragged element immediately would cancel the drag.
        this.setState({
            dragStarted: true,
            oldIndex: childIndex,
            newIndex: childIndex,
        });
    }

    private handleDragEnd(childProps: any, event: React.DragEvent<HTMLElement>) {
        this.setState({isDragging: false, dragStarted: false});
        let newIndex = this.state.newIndex;
        if (newIndex > this.state.oldIndex) {
            newIndex--; // Fix discrepancy when counting indices with this item removed from the list.
        }
        if (newIndex !== this.state.oldIndex) {
            this.props.onChangeItemPosition(childProps, newIndex);
        }
    }

    private handleDragOver(childIndex: number, event: React.DragEvent<HTMLElement>) {
        event.preventDefault();
        if (!this.state.dragStarted) {
            return;
        }
        const overElement = event.currentTarget;
        const onLowerHalf = (event.clientY - overElement.getBoundingClientRect().top) > (overElement.offsetHeight / 2);
        this.setState({
            isDragging: true,
            newIndex: onLowerHalf ? childIndex + 1 : childIndex,
        });
    }

    public render() {
        let childIndex = -1;
        const children = React.Children.map(this.props.children, child => {
            if (!React.isValidElement(child)) {
                return;
            }
            childIndex++;
            const isBeingDragged = this.state.isDragging && this.state.oldIndex === childIndex;
            return React.cloneElement(child as React.ReactElement<any>, {
                // The child should apply {...this.props.draggable} to its root HTML element
                draggableClass: isBeingDragged ? ["drag-sortable", "drag-sortable-dragging"] : ["drag-sortable"],
                draggable: {
                    draggable: true,
                    onDragStart: (i => event => { this.handleDragStart(i, event); })(childIndex),
                    onDragEnd: (cp => event => { this.handleDragEnd(cp, event); })(child.props),
                    onDragOver: (i => event => { this.handleDragOver(i, event); })(childIndex),
                },
                // The child should apply {...this.props.dragHandleFor(this)} to its drag handle element (which may be the root)
                dragHandleFor: _child => ({
                    onMouseDown: () => this.setState({handleInUse: true}),
                    onMouseLeave: () => this.setState({handleInUse: false}),
                }),
            });
        });
        // If applicable, insert a placeholder into the children:
        if (this.state.isDragging) {
            children.splice(this.state.newIndex, 0, this.props.placeholder);
        }
        return React.createElement(this.props.wrapperElementType, this.props.wrapperElementProps, children);
    }
}
