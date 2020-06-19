import * as React from 'react';

import {ButtonWithPopup} from '../widgets/button-with-popup';

interface Props {
    groupId: number;
    groupName: string;
    onEdit: (groupId: number) => void;
    onDelete: (groupId: number) => void;
}

/**
 * A row in the table on the budget tab, representing a group of categories
 */
export class CategoryGroupRow extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
        this.handleEdit = this.handleEdit.bind(this);
        this.handleDeleteButton = this.handleDeleteButton.bind(this);
    }

    private handleEdit() {
        this.props.onEdit(this.props.groupId);
    }

    private handleDeleteButton() {
        this.props.onDelete(this.props.groupId);
    }

    public render() {
        return (
            <tr>
                <td colSpan={3}>
                    <h1>{this.props.groupName}</h1>
                </td>
                <td className="if-action-buttons">
                    <button className="ifc ifc-p ifc-small" onClick={this.handleEdit} title="Edit">
                        <span className="fa fa-pencil-square-o" aria-hidden="true"></span> <span className="sr">Edit Category Group</span>
                    </button>
                    <ButtonWithPopup toggleButton={
                        <button className="ifc ifc-p ifc-small" title="Actions"><span aria-hidden="true">⋯</span> <span className="sr">More Actions</span></button>
                    }>
                        <li><button className="ifc" onClick={this.handleDeleteButton}><span className="fa fa-trash" aria-hidden="true"></span> Delete</button></li>
                    </ButtonWithPopup>
                </td>
                <td></td>
            </tr>
        );
    }
}
