import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';
import {Link} from 'react-router-dom';

import * as Prophecy from 'prophecy-engine';
import * as actions from '../actions';
import {RootStore} from '../app';
import {DropToUploadWrapper} from './widgets/drop-to-upload-wrapper';

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    allBudgets: RootStore['budgetList']['allBudgets'];
    isCreatingBudget: boolean;
}

/**
 * List of all of the user's current budgets plus UI for creating a new one.
 */
class _BudgetList extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
        this.handleNewBudget = this.handleNewBudget.bind(this);
        this.handleImport = this.handleImport.bind(this);
    }

    /** Create a new budget. */
    private handleNewBudget() {
        this.props.dispatch(actions.newBudget({}));
    }

    /** Import an existing budget */
    private handleImport(files: FileList) {
        const file = files[0];
        const ext = file.name.toLowerCase().substr(file.name.length - 4);
        if (ext !== "json") {
            this.props.dispatch(actions.showMessage("Only Prophecy JSON files can be imported."));
            return;
        }
        // Parse the file as JSON:
        const reader = new FileReader();
        reader.onload = loadEvent => {
            const jsonString = (loadEvent.target as any).result; // TODO: remove 'as any' once https://github.com/Microsoft/TypeScript/issues/4163 is fixed
            try {
                const budgetJson = JSON.parse(jsonString);
                const newBudget = Prophecy.Budget.fromJS(budgetJson); // Test that the budget JSON is valid
                this.props.dispatch(actions.newBudget({budgetJson: newBudget.toJS()}));
            } catch (err) {
                this.props.dispatch(actions.showMessage(
                    <div>
                        <p>Ratio was unable to import this file.</p>
                        <p>Details: {err.message}</p>
                    </div>
                ));
            }
        };
        reader.readAsText(file);
    }

    public render() {
        return (
            <div className="grid">
                <div className="cell">
                    <DropToUploadWrapper
                        dropMessage={<p>Drop a <strong>JSON</strong> file here to import an existing budget.</p>}
                        onFileDrop={this.handleImport}
                        keyShortcut='i'
                    >
                        {this.props.allBudgets.size > 0 || this.props.isCreatingBudget ?
                            <div>
                                <p>Here are your budgets:</p>
                                <ul>
                                    {this.props.isCreatingBudget ? <li>Creating budget...</li> : null}
                                    {this.props.allBudgets.map(budget =>
                                        <li key={budget.id}>
                                            <Link to={`/budget/${budget.id}`}>{budget.name}</Link>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        :
                            <p>You don't have any budgets yet. Use the button below to create one.</p>
                        }

                        <div id="budget-list-new-buttons">
                            <button className="ifc" onClick={this.handleNewBudget} disabled={this.props.isCreatingBudget}>
                                <span className="fa fa-plus-circle" aria-hidden="true"></span> Add a New Budget
                            </button>
                        </div>
                        <p>Tip: You can also drag an exported budget here (or press "i") to import a budget.</p>
                    </DropToUploadWrapper>
                </div>
            </div>
        );
    }
}

export const BudgetList = connect((state: RootStore, ownProps: OwnProps) => ({
    allBudgets: state.budgetList.allBudgets,
    isCreatingBudget: state.budgetList.isCreatingBudget,
}))(_BudgetList);
