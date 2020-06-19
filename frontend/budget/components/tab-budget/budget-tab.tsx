import {actions as prophecyActions, BalanceMap, Budget, PDate} from 'prophecy-engine';
import * as React from 'react';
import * as Modal from 'react-modal';
import {connect, DispatchProp} from 'react-redux';
import {Route, RouteComponentProps, Switch} from 'react-router-dom';

import {RootStore} from '../../app';

import {CategoryDeleteWidget} from './category-delete';
import {CategoryEditWidget} from './category-edit';
import {CategoryGroupDeleteWidget} from './category-group-delete';
import {CategoryGroupEditWidget} from './category-group-edit';
import {CategoryGroupRow} from './category-group-row';
import {CategoryRow} from './category-row';

Modal.setAppElement('#app');

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootStore>, RouteComponentProps<{}> {
    budgetId: number;
    balances: BalanceMap;
    budgets: BalanceMap;
    budgetsTotal: BalanceMap;
    categories: Budget['categories'];
    categoryGroups: Budget['categoryGroups'];
    currentDate: PDate;
    nextCategoryId: number;
}


/**
 * Budget Tab View for a specific budget
 *
 * Displays the various spending categories and the dollar amount allocated to each, etc.
 */
class _BudgetTab extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
        this.newCategory = this.newCategory.bind(this);
        this.editCategory = this.editCategory.bind(this);
        this.deleteCategory = this.deleteCategory.bind(this);
        this.duplicateCategory = this.duplicateCategory.bind(this);
        this.newCategoryGroup = this.newCategoryGroup.bind(this);
        this.editCategoryGroup = this.editCategoryGroup.bind(this);
        this.deleteCategoryGroup = this.deleteCategoryGroup.bind(this);
        this.stopEditingCategory = this.stopEditingCategory.bind(this);
    }

    /** Handle the 'New category' button */
    private newCategory() {
        this.props.history.push(`${this.props.match.url}/category/new`);
    }
    /** Handle the 'Edit category' buttons */
    private editCategory(categoryId) {
        this.props.history.push(`${this.props.match.url}/category/${categoryId}/edit`);
    }
    /** Handle the 'Delete category' buttons */
    private deleteCategory(categoryId) {
        this.props.history.push(`${this.props.match.url}/category/${categoryId}/delete`);
    }
    /** Handle the 'Duplicate category' buttons */
    private duplicateCategory(categoryId) {
        const originalCategory = this.props.categories.get(categoryId);
        const data = originalCategory.toJS();
        delete data.id;
        data.name = `${data.name} (Copy)`;
        this.props.dispatch({
            type: prophecyActions.UPDATE_CATEGORY,
            id: this.props.nextCategoryId,
            budgetId: this.props.budgetId,
            data,
        });
    }
    /** Handle the 'New group' button */
    private newCategoryGroup() {
        this.props.history.push(`${this.props.match.url}/category-group/new`);
    }
    /** Handle the 'Edit category group' buttons */
    private editCategoryGroup(groupId) {
        this.props.history.push(`${this.props.match.url}/category-group/${groupId}/edit`);
    }
    /** Handle the 'Delete category group' buttons */
    private deleteCategoryGroup(groupId) {
        this.props.history.push(`${this.props.match.url}/category-group/${groupId}/delete`);
    }

    private stopEditingCategory() {
        this.props.history.push(this.props.match.url);
    }

    public render() {
        return (
            <div className="grid no-padding" id="budget-tab-budget-content">
                <div className="cell">
                    <table>
                        <thead>
                            <tr>
                                <th id="budget-header-category">Category</th>
                                <th id="budget-header-status">Status</th>
                                <th id="budget-header-details">Details</th>
                                <th id="budget-header-actions"><span className="sr">Actions</span></th>
                                <th id="budget-header-notes">Notes</th>
                            </tr>
                        </thead>
                        {this.props.categoryGroups.valueSeq().map(group => (
                            <tbody key={group.id}>
                                <CategoryGroupRow groupId={group.id} groupName={group.name} onEdit={this.editCategoryGroup} onDelete={this.deleteCategoryGroup} />
                                {this.props.categories.valueSeq().filter(cat => cat.groupId === group.id).map(category =>
                                    <CategoryRow
                                        key={category.id}
                                        category={category}
                                        categoryBalance={this.props.balances.get(category.id, 0)}
                                        categoryBudgetToDate={this.props.budgets.get(category.id)}
                                        categoryBudgetTotal={this.props.budgetsTotal.get(category.id)}
                                        currentDate={this.props.currentDate}
                                        onEdit={this.editCategory}
                                        onDuplicate={this.duplicateCategory}
                                        onDelete={this.deleteCategory}
                                    />
                                )}
                            </tbody>
                        ))}
                    </table>

                    <div id="transactions-tab-new-category-buttons">
                        <button className="ifc" onClick={this.newCategory} disabled={this.props.categoryGroups.size === 0}>
                            <span className="fa fa-plus-circle" aria-hidden="true"></span> Add New
                        </button>
                        <button className="ifc" onClick={this.newCategoryGroup}>
                            <span className="fa fa-plus-circle" aria-hidden="true"></span> Add New Group
                        </button>
                    </div>

                    <Switch>
                        {/* Create/edit category modals */}
                        <Route exact path={`${this.props.match.url}/category/new`} render={routeProps => (
                            <Modal
                                isOpen={true}
                                className='influx-modal'
                                overlayClassName='influx-modal-overlay'
                                contentLabel="New Category"
                                onRequestClose={this.stopEditingCategory}
                                {...routeProps}
                            >
                                <CategoryEditWidget categoryId={undefined} onRequestClose={this.stopEditingCategory} />
                            </Modal>
                        )} />
                        <Route exact path={`${this.props.match.url}/category/:id/edit`} render={routeProps => (
                            <Modal
                                isOpen={true}
                                className='influx-modal'
                                overlayClassName='influx-modal-overlay'
                                contentLabel="Category Details"
                                onRequestClose={this.stopEditingCategory}
                                {...routeProps}
                            >
                                <CategoryEditWidget categoryId={parseInt(routeProps.match.params.id, 10)} onRequestClose={this.stopEditingCategory} />
                            </Modal>
                        )} />
                        <Route exact path={`${this.props.match.url}/category/:id/delete`} render={routeProps => (
                            <Modal
                                isOpen={true}
                                className='influx-modal'
                                overlayClassName='influx-modal-overlay'
                                contentLabel="Delete Category"
                                onRequestClose={this.stopEditingCategory}
                                {...routeProps}
                            >
                                <CategoryDeleteWidget categoryId={parseInt(routeProps.match.params.id, 10)} onRequestClose={this.stopEditingCategory} />
                            </Modal>
                        )} />

                        {/* Create/edit category group modals */}
                        <Route exact path={`${this.props.match.url}/category-group/new`} render={routeProps => (
                            <Modal
                                isOpen={true}
                                className='influx-modal'
                                overlayClassName='influx-modal-overlay'
                                contentLabel="New Category Group"
                                onRequestClose={this.stopEditingCategory}
                                {...routeProps}
                            >
                                <CategoryGroupEditWidget groupId={undefined} onRequestClose={this.stopEditingCategory} />
                            </Modal>
                        )} />
                        <Route exact path={`${this.props.match.url}/category-group/:id/edit`} render={routeProps => (
                            <Modal
                                isOpen={true}
                                className='influx-modal'
                                overlayClassName='influx-modal-overlay'
                                contentLabel="Category Group Details"
                                onRequestClose={this.stopEditingCategory}
                                {...routeProps}
                            >
                                <CategoryGroupEditWidget groupId={parseInt(routeProps.match.params.id, 10)} onRequestClose={this.stopEditingCategory} />
                            </Modal>
                        )} />
                        <Route exact path={`${this.props.match.url}/category-group/:id/delete`} render={routeProps => (
                            <Modal
                                isOpen={true}
                                className='influx-modal'
                                overlayClassName='influx-modal-overlay'
                                contentLabel="Delete Category Group"
                                onRequestClose={this.stopEditingCategory}
                                {...routeProps}
                            >
                                <CategoryGroupDeleteWidget groupId={parseInt(routeProps.match.params.id, 10)} onRequestClose={this.stopEditingCategory} />
                            </Modal>
                        )} />
                        <Route />
                    </Switch>
                </div>
            </div>
        );
    }
}

export const BudgetTab = connect((state: RootStore, ownProps: OwnProps) => ({
    budgetId: state.budgetView.budget.id,
    balances: state.budgetView.budget.categoryBalancesOnDate(state.budgetView.currentDate),
    budgets: state.budgetView.budget.categoryBudgetsOnDate(state.budgetView.currentDate),
    budgetsTotal: state.budgetView.budget.categoryBudgetsOnDate(state.budgetView.budget.endDate),
    categories: state.budgetView.budget.categories,
    categoryGroups: state.budgetView.budget.categoryGroups,
    currentDate: state.budgetView.currentDate,
    nextCategoryId: state.budgetView.generateNewIdFor('categories'),
}))(_BudgetTab);
