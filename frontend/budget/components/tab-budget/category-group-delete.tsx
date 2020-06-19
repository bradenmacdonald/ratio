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
    categoryCount: number;
    budgetLoading: boolean;
}
interface State {
}

/**
 * Widget for editing a category group.
 */
class _CategoryGroupDeleteWidget extends React.PureComponent<Props, State> {

    public static defaultProps: Partial<Props> = {
        onRequestClose: () => {},
    };

    constructor(props) {
        super(props);
        this.handleDelete = this.handleDelete.bind(this);
    }

    /** Accept the changes and create/update the category group. */
    private handleDelete() {
        this.props.dispatch({
            type: prophecyActions.DELETE_CATEGORY_GROUP,
            id: this.props.groupId,
            budgetId: this.props.budget.id,
        });
        this.props.onRequestClose();
    }

    public render() {
        if (this.props.budgetLoading) {
            // With a direct URL like '/budget/1/budget/category-group/3/delete', this popup may be displayed
            // before the budget has finished loading.
            return <div>Loading...</div>;
        }

        const group = this.props.categoryGroup;
        if (!group) {
            return <div>Category group does not exist or has been deleted</div>;
        }

        const containsCategories = this.props.categoryCount > 0;
        const canDelete = !containsCategories;

        return (
            <div className="category-editor">
                <h1>{`Delete Category Group: ${group.name}`}</h1>
                <p>
                    {containsCategories ?
                        `This group contains ${this.props.categoryCount} categories. You must delete or move the categories before you can delete this group.`
                    :
                        'Are you sure you want to delete this group?'
                    }
                </p>
                <div className="modal-action-bar">
                    <button className="ifc ifc-small ifc-default" onClick={this.handleDelete} disabled={!canDelete}><span className="fa fa-trash" aria-hidden="true"></span> Delete</button>
                    <button className="ifc ifc-small" onClick={this.props.onRequestClose}>Cancel</button>
                </div>
            </div>
        );
    }
}

export const CategoryGroupDeleteWidget = connect((state: RootStore, ownProps: OwnProps) => {
    const categoryGroup: CategoryGroup = state.budgetView.budget.categoryGroups.get(ownProps.groupId);
    const categoryCount = state.budgetView.budget.categories.valueSeq().filter(cat => cat.groupId === ownProps.groupId).count();
    return {
        budget: state.budgetView.budget,
        categoryGroup,
        categoryCount,
        budgetLoading: state.budgetView.budgetLoading,
    };
})(_CategoryGroupDeleteWidget);
