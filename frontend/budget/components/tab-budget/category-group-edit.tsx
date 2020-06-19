import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import {actions as prophecyActions, Budget, CategoryGroup} from 'prophecy-engine';
import {RootStore} from '../../app';
import {DirectTextField} from '../widgets/text-field-direct';

interface OwnProps {
    groupId: number;
    onRequestClose: () => void;
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    budget: Budget;
    categoryGroup: CategoryGroup;
    budgetLoading: boolean;
    safeIdPrefix: number;
}
interface State {
    categoryGroup: CategoryGroup;
}

/**
 * Widget for editing a category group.
 */
class _CategoryGroupEditWidget extends React.PureComponent<Props, State> {

    public static defaultProps: Partial<Props> = {
        onRequestClose: () => {},
    };

    constructor(props) {
        super(props);
        // Set the state:
        this.state = {
            categoryGroup: this.props.categoryGroup,
        };
        // Bind events to this:
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleSave = this.handleSave.bind(this);
    }

    /** Accept the changes and create/update the category group. */
    private handleSave() {
        let groupId = this.props.groupId;
        if (groupId === undefined) {
            // We are creating a new category group
            groupId = this.props.safeIdPrefix;
            while (this.props.budget.categoryGroups.has(groupId)) {
                groupId++;
            }
        }
        const data = this.state.categoryGroup.toJS();
        delete data.id;
        this.props.dispatch({
            type: prophecyActions.UPDATE_CATEGORY_GROUP,
            id: groupId,
            budgetId: this.props.budget.id,
            data,
        });
        this.props.onRequestClose();
    }

    private handleNameChange(newName) {
        this.setState({categoryGroup: this.state.categoryGroup.set('name', newName)});
    }

    public render() {
        if (this.props.budgetLoading) {
            // With a direct URL like '/budget/1/budget/category-group/3/edit', this popup may be displayed
            // before the budget has finished loading.
            return <div>Loading...</div>;
        }

        const group = this.state.categoryGroup;
        if (this.props.groupId && !group) {
            return <div>Category group does not exist or has been deleted</div>;
        }

        return (
            <div className="category-editor">
                <h1>{group.id ? `Edit Category Group: ${group.name}` : "New Category Group"}</h1>
                <div className="if-responsive-form">
                    <div className="if-field">
                        <label htmlFor="if-cat-name"><span className="sr">Category Group</span> Name</label>
                        <DirectTextField attrs={{id: "if-cat-name", autoFocus: true}} value={group.name} onValueChange={this.handleNameChange} />
                    </div>
                </div>
                <div className="modal-action-bar">
                    <button className="ifc ifc-small ifc-default" onClick={this.handleSave} disabled={!group.name}><span className="fa fa-check-circle-o" aria-hidden="true"></span> Save</button>
                    <button className="ifc ifc-small" onClick={this.props.onRequestClose}>Cancel</button>
                </div>
            </div>
        );
    }
}

export const CategoryGroupEditWidget = connect((state: RootStore, ownProps: OwnProps) => {
    const categoryGroup = ownProps.groupId ?
        state.budgetView.budget.categoryGroups.get(ownProps.groupId) // Editing an existing category group
        : new CategoryGroup(); // Creating a new category group
    return {
        budget: state.budgetView.budget,
        categoryGroup,
        budgetLoading: state.budgetView.budgetLoading,
        safeIdPrefix: state.budgetView.safeIdPrefix,
    };
})(_CategoryGroupEditWidget);
