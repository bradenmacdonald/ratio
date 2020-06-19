import {Budget, Category, CategoryGroup, Immutable} from 'prophecy-engine';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import {RootStore} from '../../app';

export const SPLIT_VALUE = '_split'; // String used as the category <option> value to [further] split the transaction
export const UNSPLIT_VALUE = '_unsplit'; // String used as the category <option> value to un-split the transaction
export const TRANSFER_VALUE = '_xfr'; // String used as the category <select>/<option> value when the transaction is a transfer (thus must have no category set.)

interface OwnProps {
    categoryId: number;
    detailIndex: number;
    detailSize: number;
    onCategorySelected: (detailIndex: number, newValue: string) => void;
    isTransfer: boolean;
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    categories: Budget['categories'];
    categoryGroups: Budget['categoryGroups'];
}
interface State {
    selectElementFocused: boolean;
}

/**
 * Widget for editing the 'category' of a single TransactionDetail entry.
 */
class _CategorySelectorWidget extends React.PureComponent<Props, State> {
    constructor(props) {
        super(props);
        this.state = {
            selectElementFocused: false,
        };
        this.handleSelection = this.handleSelection.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
    }

    /** A Category or a pseudo-category ("Transfer" or "Split..." or "UnSplit") has been selected */
    private handleSelection(event: React.ChangeEvent<HTMLSelectElement>) {
        const newValue = event.target.value;
        this.props.onCategorySelected(this.props.detailIndex, newValue);
    }

    /** Flesh out the list of categories only when the category <select> is focused - keeps the DOM lean and reduces need for updates. */
    private handleFocus() {
        this.setState({selectElementFocused: true});
    }

    private handleBlur() {
        this.setState({selectElementFocused: false});
    }

    public render() {
        const categoryId = this.props.categoryId;
        const isSplit = this.props.detailSize > 1;
        return (
            <select value={this.props.isTransfer ? TRANSFER_VALUE : categoryId || ''} aria-label="Category" className="ifc ifc-p txn-category-select" onChange={this.handleSelection} onFocus={this.handleFocus} onBlur={this.handleBlur}>
                <option value=''>(Select a Category...)</option>
                {/* For efficiency, we only include the full list of categories when needed (when this select element has focus) */}
                {this.state.selectElementFocused ?
                    this.props.categoryGroups.valueSeq().map(group =>
                        <optgroup key={group.id} label={group.name}>
                            {this.props.categories.filter(c => c.groupId === group.id).valueSeq().map(category =>
                                <option key={category.id} value={category.id}>{category.name}</option>
                            )}
                        </optgroup>
                    )
                :
                    (categoryId ? <option value={categoryId}>{this.props.categories.get(categoryId).name}</option> : null)
                }
                <optgroup label="Other options">
                    {/* If this is not a split transaction, it can be a transfer transaction in which case the category must be null: */}
                    {isSplit === false ? <option value={TRANSFER_VALUE}>Transfer ↔</option> : null}
                    {/* If this is the last or only category selection box, allow splitting the transaction [further]: */}
                    {this.props.detailIndex === (this.props.detailSize - 1) ? <option value={SPLIT_VALUE}>Split...</option> : null}
                    {/* If this is already a split transaction, allow un-splitting it: */}
                    {isSplit === true ? <option value={UNSPLIT_VALUE}>Un-split</option> : null}
                </optgroup>
            </select>
        );
    }
}

export const CategorySelectorWidget = connect((state: RootStore, ownProps: OwnProps) => {
    return {
        categories: state.budgetView.budget.categories,
        categoryGroups: state.budgetView.budget.categoryGroups,
    };
})(_CategorySelectorWidget);
