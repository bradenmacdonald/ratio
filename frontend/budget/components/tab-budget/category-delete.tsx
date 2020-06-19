import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import {actions as prophecyActions, Budget, Category} from 'prophecy-engine';
import {RootStore} from '../../app';
import {DirectTextField} from '../widgets/text-field-direct';

interface OwnProps {
    categoryId: number;
    onRequestClose: () => void;
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    budget: Budget;
    category: Category;
    transactionCount: number;
    budgetLoading: boolean;
}
interface State {
}

/**
 * Widget for editing a category group.
 */
class _CategoryDeleteWidget extends React.PureComponent<Props, State> {

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
            type: prophecyActions.DELETE_CATEGORY,
            id: this.props.categoryId,
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

        const group = this.props.category;
        if (!group) {
            return <div>Category does not exist or has been deleted.</div>;
        }

        const transactionsWarning = this.props.transactionCount > 0 ?
            (<p>There are {this.props.transactionCount} transaction(s) that are assigned to this category. If you delete it, those transactions won't be linked to any category.</p>)
            : null;

        return (
            <div className="category-editor">
                <h1>{`Delete Category: ${group.name}`}</h1>
                <p>Are you sure you want to delete this category?</p>
                {transactionsWarning}
                <div className="modal-action-bar">
                    <button className="ifc ifc-small ifc-default" onClick={this.handleDelete}><span className="fa fa-trash" aria-hidden="true"></span> Delete</button>
                    <button className="ifc ifc-small" onClick={this.props.onRequestClose}>Cancel</button>
                </div>
            </div>
        );
    }
}

export const CategoryDeleteWidget = connect((state: RootStore, ownProps: OwnProps) => {
    const category: Category = state.budgetView.budget.categories.get(ownProps.categoryId);
    const transactionCount = state.budgetView.budget.transactions.valueSeq().filter(txn => !txn.detail.valueSeq().filter(d => d.categoryId === ownProps.categoryId).isEmpty()).count();
    return {
        budget: state.budgetView.budget,
        category,
        transactionCount,
        budgetLoading: state.budgetView.budgetLoading,
    };
})(_CategoryDeleteWidget);
