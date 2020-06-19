import * as React from 'react';
import * as Modal from 'react-modal';
import {connect, DispatchProp} from 'react-redux';

import * as actions from '../actions';
import {RootStore} from '../app';
import {ModalMessage} from '../modal-message';

Modal.setAppElement('#app');

interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootStore> {
    currentModalMessage: ModalMessage|undefined;
}

/**
 * Helper component that can display modal messages (like alert())
 *
 * It doesn't really matter where in the DOM tree this component is.
 */
class _ModalMessagesComponent extends React.PureComponent<Props> {

    constructor(props: Props) {
        super(props);
        this.dismissModalMessage = this.dismissModalMessage.bind(this);
    }

    /** Code to dismiss the current modal popup, if any */
    private dismissModalMessage() {
        this.props.dispatch({type: actions.DISMISS_MESSAGE});
    }

    public render() {
        const message = this.props.currentModalMessage;
        if (message === undefined) {
            return null;
        }
        return (
            <Modal
                isOpen={true}
                className='influx-modal'
                overlayClassName='influx-modal-overlay'
                contentLabel="Message"
                onRequestClose={this.dismissModalMessage}
            >
                {this.props.currentModalMessage.message}
                <div className="modal-action-bar">
                    <button className="ifc ifc-small ifc-default" onClick={this.dismissModalMessage}>{this.props.currentModalMessage.buttonText}</button>
                </div>
            </Modal>
        );
    }
}

export const ModalMessagesComponent = connect((state: RootStore, ownProps: OwnProps) => ({
    currentModalMessage: state.messages.currentMessage,
}))(_ModalMessagesComponent);
